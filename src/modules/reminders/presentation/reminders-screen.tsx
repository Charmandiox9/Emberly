import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { AppState, Linking, Text, View } from 'react-native';
import { Button } from '../../../shared/ui/button';
import { ChoiceGroup, type ChoiceOption } from '../../../shared/ui/choice-group';
import { Field } from '../../../shared/ui/field';
import { notifications } from '../../../shared/ui/notifications';
import { ResourceFeedback } from '../../../shared/ui/resource-feedback';
import { Screen, screenStyles } from '../../../shared/ui/screen';
import { useTheme } from '../../../shared/ui/theme';
import { useFocusResource } from '../../../shared/ui/use-focus-resource';
import {
  formatReminderTime,
  parseReminderTime,
  reminderBody,
  reminderTitle,
  type ReminderService,
  type ReminderState,
} from '../index';

interface RemindersScreenProps {
  readonly service: ReminderService;
}
interface ReminderFormProps extends RemindersScreenProps {
  readonly initial: ReminderState;
}
interface AppliedReminderState {
  readonly baseline: ReminderState;
  readonly state: ReminderState;
}
const choices: readonly ChoiceOption<'on' | 'off'>[] = [
  { value: 'off', label: 'Desactivado' },
  { value: 'on', label: 'Activado' },
];
export function RemindersScreen({ service }: RemindersScreenProps): ReactElement {
  const read = useCallback(() => service.read(), [service]);
  const { state, reload } = useFocusResource(read, 'reminders');
  return (
    <Screen title="Ajustes de recordatorios">
      {state.status !== 'ready' ? (
        <ResourceFeedback status={state.status} retry={reload} />
      ) : (
        <ReminderForm service={service} initial={state.data} />
      )}
    </Screen>
  );
}
function statusMessage(state: ReminderState): string {
  switch (state.status) {
    case 'development-build-required':
      return 'Este cliente no incluye los módulos necesarios para los recordatorios. Usa una compilación de desarrollo actualizada; las funciones financieras siguen disponibles.';
    case 'disabled':
      return 'Recordatorio desactivado.';
    case 'scheduled':
      return `Recordatorio diario programado para aproximadamente las ${formatReminderTime(state.settings)}, hora del teléfono.`;
    case 'permission-required':
      return state.canAskAgain
        ? 'Falta permiso para mostrar notificaciones. Activa y guarda para solicitarlo.'
        : 'Android no permite mostrar notificaciones. Puedes habilitarlas en los ajustes del teléfono.';
    case 'channel-blocked':
      return 'El canal de recordatorios está bloqueado en Android. Puedes habilitarlo desde los ajustes del teléfono.';
    case 'pending':
      return state.settings.enabled
        ? 'La preferencia está guardada, pero no pudimos confirmar el recordatorio. Reintenta.'
        : 'Guardamos la desactivación, pero no pudimos confirmar la cancelación. Podría seguir programado; reintenta o desactiva sus notificaciones en los ajustes del teléfono.';
  }
}
function ReminderForm({ service, initial }: ReminderFormProps): ReactElement {
  const theme = useTheme();
  const [enabled, setEnabled] = useState(initial.settings.enabled);
  const [time, setTime] = useState(() => formatReminderTime(initial.settings));
  const [result, setResult] = useState<AppliedReminderState>(() => ({
    baseline: initial,
    state: initial,
  }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const visible = result.baseline === initial ? result.state : initial;
  useEffect(() => {
    let active = true;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void service
        .read()
        .then((saved) => {
          if (active) setResult({ baseline: initial, state: saved });
        })
        .catch(() => {
          if (active) setError('No pudimos comprobar el estado. Reintenta.');
        });
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [service, initial]);
  async function save(): Promise<void> {
    if (lock.current) return;
    let parsed: ReturnType<typeof parseReminderTime>;
    try {
      parsed = parseReminderTime(time);
    } catch {
      if (enabled) {
        setError('Usa una hora válida entre 00:00 y 23:59.');
        return;
      }
      parsed = visible.settings;
    }
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const saved = await service.save({ ...parsed, enabled });
      setResult({ baseline: initial, state: saved });
      if (saved.status === 'scheduled' || saved.status === 'disabled')
        notifications.success(
          saved.status === 'scheduled' ? 'Recordatorio programado' : 'Recordatorio desactivado',
        );
    } catch {
      setError('No pudimos guardar la preferencia. El horario sigue aquí para reintentar.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Text style={[screenStyles.body, { color: theme.secondary }]}>
        Un aviso diario opcional para revisar tu día. Solo solicitaremos permiso cuando actives y
        guardes el recordatorio.
      </Text>
      <View style={[screenStyles.card, { backgroundColor: theme.surface }]}>
        <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
          Estado confirmado
        </Text>
        <Text
          accessibilityLiveRegion="polite"
          style={[
            screenStyles.body,
            { color: visible.status === 'pending' ? theme.danger : theme.secondary },
          ]}
        >
          {statusMessage(visible)}
        </Text>
      </View>
      <ChoiceGroup
        label="Recordatorio diario"
        options={choices}
        value={enabled ? 'on' : 'off'}
        disabled={busy}
        onChange={(value) => setEnabled(value === 'on')}
      />
      <Field
        label="Hora del teléfono (HH:MM)"
        value={time}
        onChangeText={setTime}
        maxLength={5}
        keyboardType="numbers-and-punctuation"
        editable={!busy}
        hint="Por ejemplo, 20:00. Android puede retrasar el aviso por ahorro de batería."
        error={error}
      />
      <Button
        label={busy ? 'Guardando…' : 'Guardar y aplicar'}
        disabled={busy}
        onPress={() => {
          void save();
        }}
      />
      <Button
        label="Comprobar y reintentar"
        variant="secondary"
        disabled={busy}
        onPress={() => {
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          setError('');
          void service
            .read()
            .then((saved) => setResult({ baseline: initial, state: saved }))
            .catch(() => setError('No pudimos comprobar el estado. Reintenta.'))
            .finally(() => {
              lock.current = false;
              setBusy(false);
            });
        }}
      />
      <Button
        label="Abrir ajustes del teléfono"
        variant="secondary"
        disabled={busy}
        onPress={() => {
          void Linking.openSettings().catch(() =>
            setError('Abre los ajustes de Android y busca Emberly → Notificaciones.'),
          );
        }}
      />
      <View style={[screenStyles.card, { backgroundColor: theme.surface }]}>
        <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
          Así será el aviso
        </Text>
        <Text style={[screenStyles.body, { color: theme.text }]}>{reminderTitle}</Text>
        <Text style={[screenStyles.body, { color: theme.secondary }]}>{reminderBody}</Text>
        <Text style={[screenStyles.caption, { color: theme.secondary }]}>
          Sin montos, cuentas, metas ni comprobantes. Al tocarlo se abre Inicio. El canal se crea
          sin sonido ni vibración; Android permite ajustar sus opciones.
        </Text>
      </View>
    </>
  );
}
