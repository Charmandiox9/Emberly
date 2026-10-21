import { randomUUID } from 'expo-crypto';
import { useCallback, useRef, useState, type ReactElement } from 'react';
import { Text, View } from 'react-native';
import { parseMoney } from '../../../shared/domain/money';
import { Amount, usePrivacy } from '../../../shared/ui/amount';
import { Button } from '../../../shared/ui/button';
import { ChoiceGroup, type ChoiceOption } from '../../../shared/ui/choice-group';
import { Field } from '../../../shared/ui/field';
import { notifications } from '../../../shared/ui/notifications';
import { ResourceFeedback } from '../../../shared/ui/resource-feedback';
import { Screen, screenStyles } from '../../../shared/ui/screen';
import { useTheme } from '../../../shared/ui/theme';
import { useFocusResource } from '../../../shared/ui/use-focus-resource';
import type { AllocationCursor, AllocationKind, AllocationQuery, GoalRepository } from '../index';
import { GoalFundingCard } from './goal-funding';

interface GoalActivityProps {
  readonly repository: GoalRepository;
  readonly goalId: string;
}
interface AllocationIntent {
  readonly id: string;
  readonly createdAt: string;
}
const kinds: readonly ChoiceOption<AllocationKind>[] = [
  { value: 'contribute', label: 'Aportar' },
  { value: 'withdraw', label: 'Retirar asignación' },
];
export function GoalActivityScreen({ repository, goalId }: GoalActivityProps): ReactElement {
  const theme = useTheme();
  const { hidden, toggle } = usePrivacy();
  const [kind, setKind] = useState<AllocationKind>('contribute');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [cursors, setCursors] = useState<readonly AllocationCursor[]>([]);
  const cursor = cursors.at(-1);
  const lock = useRef(false);
  const intent = useRef<AllocationIntent | null>(null);
  const read = useCallback(async () => {
    const query: AllocationQuery = { goalId, ...(cursor ? { cursor } : {}) };
    const [overview, history] = await Promise.all([
      repository.overview(),
      repository.history(query),
    ]);
    const goal = overview.goals.find((entry) => entry.id === goalId);
    if (!goal) throw new Error('La meta no existe.');
    return { goal, funding: overview.funding, history };
  }, [repository, goalId, cursor]);
  const { state, reload } = useFocusResource(read, JSON.stringify({ goalId, cursor }));

  async function save(): Promise<void> {
    if (lock.current || state.status !== 'ready') return;
    let value: ReturnType<typeof parseMoney>;
    try {
      value = parseMoney(amount);
      if (value.amountMinor <= 0) throw new Error('Positive amount required');
    } catch {
      setError('Ingresa un monto positivo en pesos enteros.');
      return;
    }
    if (
      kind === 'contribute' &&
      (value.amountMinor > state.data.funding.available.amountMinor ||
        value.amountMinor > state.data.goal.remaining.amountMinor)
    ) {
      setError('El aporte supera el dinero disponible o lo que falta para la meta.');
      return;
    }
    if (kind === 'withdraw' && value.amountMinor > state.data.goal.assigned.amountMinor) {
      setError('El retiro supera lo asignado a esta meta.');
      return;
    }
    lock.current = true;
    setSaving(true);
    setError('');
    try {
      const operation = intent.current ?? { id: randomUUID(), createdAt: new Date().toISOString() };
      intent.current = operation;
      await repository.allocate({ ...operation, goalId, kind, amount: value });
      notifications.success(kind === 'contribute' ? 'Aporte registrado' : 'Asignación retirada');
      intent.current = null;
      setAmount('');
      setCursors([]);
      reload();
    } catch {
      setError(
        'No pudimos confirmar la asignación. Tus datos siguen aquí; reintenta o vuelve a abrir el historial para comprobar su estado.',
      );
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  return (
    <Screen title={state.status === 'ready' ? state.data.goal.name : 'Aportes y retiros'}>
      {state.status !== 'ready' ? (
        <ResourceFeedback status={state.status} retry={reload} />
      ) : (
        <>
          <GoalFundingCard funding={state.data.funding} />
          <Button
            label={hidden ? 'Mostrar montos' : 'Ocultar montos'}
            variant="secondary"
            onPress={toggle}
          />
          <Text style={[screenStyles.caption, { color: theme.secondary }]}>
            Asignado a esta meta
          </Text>
          <Amount value={state.data.goal.assigned} />
          <Text style={[screenStyles.caption, { color: theme.secondary }]}>
            Falta para el objetivo
          </Text>
          <Amount value={state.data.goal.remaining} />
          <ChoiceGroup
            label="Operación"
            options={kinds}
            value={kind}
            onChange={setKind}
            disabled={saving}
          />
          <Field
            label="Monto en pesos chilenos"
            value={amount}
            onChangeText={setAmount}
            maxLength={24}
            keyboardType="numeric"
            editable={!saving}
            hint="Retirar libera la asignación; no es un ingreso y no cambia el saldo de tus cuentas."
            error={error}
          />
          <Button
            label={
              saving
                ? 'Guardando…'
                : kind === 'contribute'
                  ? 'Confirmar aporte'
                  : 'Confirmar retiro de asignación'
            }
            disabled={saving}
            onPress={() => {
              void save();
            }}
          />
          <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
            Historial de asignaciones
          </Text>
          <Text style={[screenStyles.caption, { color: theme.secondary }]}>
            Los registros conservan su auditoría. Para corregirlos, registra una operación en
            sentido contrario.
          </Text>
          {state.data.history.entries.length === 0 ? (
            <Text style={[screenStyles.body, { color: theme.secondary }]}>
              Todavía no hay aportes ni retiros.
            </Text>
          ) : (
            state.data.history.entries.map((allocation) => (
              <View
                key={allocation.id}
                style={[screenStyles.card, { backgroundColor: theme.surface }]}
              >
                <Text style={[screenStyles.heading, { color: theme.text }]}>
                  {allocation.kind === 'contribute' ? 'Aporte' : 'Retiro de asignación'}
                </Text>
                <Amount value={allocation.amount} />
                <Text style={[screenStyles.caption, { color: theme.secondary }]}>
                  {new Intl.DateTimeFormat('es-CL', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: 'America/Santiago',
                  }).format(new Date(allocation.createdAt))}
                </Text>
              </View>
            ))
          )}
          {cursors.length > 0 ? (
            <Button
              label="Página anterior"
              variant="secondary"
              disabled={saving}
              onPress={() => setCursors((current) => current.slice(0, -1))}
            />
          ) : null}
          {state.data.history.nextCursor ? (
            <Button
              label="Página siguiente"
              variant="secondary"
              disabled={saving}
              onPress={() => {
                const next = state.data.history.nextCursor;
                if (next) setCursors((current) => [...current, next]);
              }}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}
