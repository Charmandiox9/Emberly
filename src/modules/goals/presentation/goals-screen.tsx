import { randomUUID } from 'expo-crypto';
import { useCallback, useRef, useState, type ReactElement } from 'react';
import { Text, View } from 'react-native';
import { createBusinessDate } from '../../../shared/domain/business-date';
import { parseMoney, type Money } from '../../../shared/domain/money';
import { Amount, usePrivacy } from '../../../shared/ui/amount';
import { Button } from '../../../shared/ui/button';
import { DateField } from '../../../shared/ui/date-field';
import { Field } from '../../../shared/ui/field';
import { notifications } from '../../../shared/ui/notifications';
import { Progress } from '../../../shared/ui/progress';
import { ResourceFeedback } from '../../../shared/ui/resource-feedback';
import { Screen, screenStyles } from '../../../shared/ui/screen';
import { useTheme } from '../../../shared/ui/theme';
import { useFocusResource } from '../../../shared/ui/use-focus-resource';
import type { GoalEntry, GoalRepository } from '../index';
import { GoalFundingCard } from './goal-funding';

interface GoalsScreenProps {
  readonly repository: GoalRepository;
  readonly onActivity: (id: string) => void;
}
interface FormErrors {
  readonly name?: string;
  readonly target?: string;
  readonly deadline?: string;
  readonly general?: string;
}
export function GoalsScreen({ repository, onActivity }: GoalsScreenProps): ReactElement {
  const theme = useTheme();
  const { hidden, toggle } = usePrivacy();
  const [editing, setEditing] = useState<GoalEntry | null>(null);
  const [id, setId] = useState(randomUUID);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const read = useCallback(() => repository.overview(), [repository]);
  const { state, reload } = useFocusResource(read, 'goals');
  function clear(): void {
    setEditing(null);
    setName('');
    setTarget('');
    setDeadline('');
    setErrors({});
  }
  async function save(): Promise<void> {
    if (lock.current) return;
    if (!name.trim() || name.trim().length > 60) {
      setErrors({ name: 'Escribe un nombre de entre 1 y 60 caracteres.' });
      return;
    }
    let amount: Money;
    try {
      amount = parseMoney(target);
      if (amount.amountMinor <= 0) throw new Error('Positive target required');
    } catch {
      setErrors({ target: 'Ingresa un objetivo positivo en pesos enteros.' });
      return;
    }
    const date = deadline.trim() || null;
    try {
      if (date !== null) createBusinessDate(date);
    } catch {
      setErrors({ deadline: 'Usa una fecha válida con formato AAAA-MM-DD o deja el campo vacío.' });
      return;
    }
    lock.current = true;
    setSaving(true);
    setErrors({});
    try {
      const changes = { name, target: amount, deadline: date };
      if (editing) await repository.update(editing.id, changes);
      else await repository.save({ ...changes, id, createdAt: new Date().toISOString() });
      notifications.success(editing ? 'Meta actualizada' : 'Meta guardada');
      clear();
      setId(randomUUID());
      reload();
    } catch {
      setErrors({
        general: 'No pudimos guardar la meta. Tus datos siguen en el formulario para reintentar.',
      });
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  const editor = (
    <View style={screenStyles.section}>
      <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
        {editing ? 'Editar meta' : 'Crear una meta'}
      </Text>
      <Field
        label="Nombre de la meta"
        value={name}
        onChangeText={setName}
        placeholder="Por ejemplo, Fondo de emergencia"
        maxLength={60}
        editable={!saving}
        error={errors.name ?? ''}
      />
      <Field
        label="Objetivo en pesos chilenos"
        value={target}
        onChangeText={setTarget}
        placeholder="Por ejemplo, 100000"
        maxLength={24}
        keyboardType="numeric"
        editable={!saving}
        error={errors.target ?? ''}
      />
      <DateField
        label="Fecha objetivo (opcional)"
        value={deadline}
        onChange={setDeadline}
        optional
        editable={!saving}
        error={errors.deadline ?? ''}
        hint="También puedes dejarla sin fecha. Al vencer no se retiran aportes."
      />
      {editing ? (
        <Text style={[screenStyles.body, { color: theme.secondary }]}>
          Cambiar el objetivo conserva todos los aportes. Si queda por debajo de lo asignado, se
          mostrará el exceso.
        </Text>
      ) : null}
      {errors.general ? (
        <Text accessibilityRole="alert" style={[screenStyles.body, { color: theme.danger }]}>
          {errors.general}
        </Text>
      ) : null}
      <Button
        label={saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar meta'}
        disabled={saving}
        onPress={() => {
          void save();
        }}
      />
      {editing ? (
        <Button label="Cancelar edición" variant="secondary" disabled={saving} onPress={clear} />
      ) : null}
    </View>
  );
  return (
    <Screen title="Tus metas">
      <Button
        label={hidden ? 'Mostrar montos' : 'Ocultar montos'}
        variant="secondary"
        onPress={toggle}
      />
      {state.status !== 'ready' ? (
        <ResourceFeedback status={state.status} retry={reload} />
      ) : (
        <>
          <GoalFundingCard funding={state.data.funding} />
          {state.data.goals.length === 0 ? (
            <Text style={[screenStyles.body, { color: theme.secondary }]}>
              Crea tu primera meta y asigna una parte de tu saldo cuando estés listo.
            </Text>
          ) : null}
          {state.data.goals.map((goal) => (
            <View key={goal.id} style={[screenStyles.card, { backgroundColor: theme.surface }]}>
              <Text
                accessibilityRole="header"
                style={[screenStyles.heading, { color: theme.text }]}
              >
                {goal.name}
              </Text>
              <Text style={[screenStyles.caption, { color: theme.secondary }]}>
                {goal.complete ? 'Objetivo alcanzado en asignaciones' : 'En progreso'}
                {goal.deadline ? ` · Fecha objetivo: ${goal.deadline}` : ''}
              </Text>
              <Text style={[screenStyles.caption, { color: theme.secondary }]}>Objetivo</Text>
              <Amount value={goal.target} />
              <Text style={[screenStyles.caption, { color: theme.secondary }]}>Asignado</Text>
              <Amount value={goal.assigned} />
              {!hidden ? (
                <Progress label={`Progreso de ${goal.name}`} percentage={goal.percentage} />
              ) : null}
              <Text style={[screenStyles.caption, { color: theme.secondary }]}>
                {goal.excess.amountMinor > 0 ? 'Asignado por encima del objetivo' : 'Falta asignar'}
              </Text>
              <Amount value={goal.excess.amountMinor > 0 ? goal.excess : goal.remaining} />
              {editing?.id === goal.id ? (
                editor
              ) : (
                <Button
                  label={`Editar: ${goal.name}`}
                  variant="secondary"
                  disabled={saving || editing !== null}
                  onPress={() => {
                    clear();
                    setEditing(goal);
                    setName(goal.name);
                    setTarget(String(goal.target.amountMinor));
                    setDeadline(goal.deadline ?? '');
                  }}
                />
              )}
              <Button
                label={`Aportes y retiros: ${goal.name}`}
                disabled={saving || editing !== null}
                onPress={() => onActivity(goal.id)}
              />
            </View>
          ))}
          {!editing ? editor : null}
        </>
      )}
    </Screen>
  );
}
