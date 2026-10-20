import { randomUUID } from 'expo-crypto';
import { useCallback, useRef, useState, type ReactElement } from 'react';
import { Alert, Text } from 'react-native';
import type { Account, AccountRepository } from '../../accounts';
import { businessDateAt } from '../../../shared/domain/business-date';
import { Button } from '../../../shared/ui/button';
import { ChoiceGroup, type ChoiceOption } from '../../../shared/ui/choice-group';
import { Field } from '../../../shared/ui/field';
import { notifications } from '../../../shared/ui/notifications';
import { ResourceFeedback } from '../../../shared/ui/resource-feedback';
import { Screen, screenStyles } from '../../../shared/ui/screen';
import { useTheme } from '../../../shared/ui/theme';
import { useFocusResource } from '../../../shared/ui/use-focus-resource';
import { recordMovement } from '../application/record-movement';
import {
  validateMovementDraft,
  type MovementDraft,
  type MovementErrors,
} from '../application/movement-draft';
import type { FinanceRepository, MovementEntry } from '../application/finance-repository';
import type { Category, MovementKind } from '../domain/movement';

export interface MovementScreenProps {
  readonly repository: FinanceRepository;
  readonly accounts: AccountRepository;
  readonly id: string | undefined;
  readonly onDone: () => void;
  readonly onAccounts: () => void;
}
interface FormData {
  readonly accounts: readonly Account[];
  readonly categories: readonly Category[];
  readonly existing: MovementEntry | null;
}
interface MovementFormProps {
  readonly data: FormData;
  readonly repository: FinanceRepository;
  readonly onDone: () => void;
}
const kinds: readonly ChoiceOption<MovementKind>[] = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
];

export function MovementScreen({
  repository,
  accounts,
  id,
  onDone,
  onAccounts,
}: MovementScreenProps): ReactElement {
  const theme = useTheme();
  const read = useCallback(async (): Promise<FormData> => {
    const [options, categories, existing] = await Promise.all([
      accounts.list(),
      repository.categories(),
      id ? repository.get(id) : Promise.resolve(null),
    ]);
    if (id && !existing) throw new Error('El movimiento no existe.');
    return { accounts: options, categories, existing };
  }, [repository, accounts, id]);
  const { state, reload } = useFocusResource(read, id ?? 'new');
  return (
    <Screen title={id ? 'Editar movimiento' : 'Registrar movimiento'}>
      {state.status !== 'ready' ? (
        <ResourceFeedback status={state.status} retry={reload} />
      ) : state.data.accounts.length === 0 ? (
        <>
          <Text style={[screenStyles.body, { color: theme.secondary }]}>
            Primero agrega una cuenta para saber dónde entra y sale tu dinero.
          </Text>
          <Button label="Crear una cuenta" onPress={onAccounts} />
        </>
      ) : (
        <MovementForm key={id ?? 'new'} data={state.data} repository={repository} onDone={onDone} />
      )}
    </Screen>
  );
}

function MovementForm({ data, repository, onDone }: MovementFormProps): ReactElement {
  const theme = useTheme();
  const [id] = useState(() => data.existing?.id ?? randomUUID());
  const [draft, setDraft] = useState<MovementDraft>(() => ({
    accountId: data.existing?.accountId ?? data.accounts[0]?.id ?? '',
    categoryId:
      data.existing?.categoryId ??
      data.categories.find((category) => category.kind === 'expense')?.id ??
      '',
    kind: data.existing?.kind ?? 'expense',
    amount: data.existing ? String(data.existing.amount.amountMinor) : '',
    description: data.existing?.description ?? '',
    date: data.existing?.date ?? businessDateAt(new Date(), 'America/Santiago').value,
  }));
  const [errors, setErrors] = useState<MovementErrors>({});
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);

  async function save(): Promise<void> {
    if (lock.current) return;
    const today = businessDateAt(new Date(), 'America/Santiago').value;
    const result = validateMovementDraft(draft, {
      id,
      createdAt: data.existing?.createdAt ?? new Date().toISOString(),
      today,
    });
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    lock.current = true;
    setSaving(true);
    setErrors({});
    try {
      await recordMovement(repository, result.movement, today, data.existing !== null);
    } catch {
      setErrors({
        general:
          'No pudimos guardar. Revisa la cuenta, la categoría y el monto. Tus datos siguen aquí para reintentar.',
      });
      return;
    } finally {
      lock.current = false;
      setSaving(false);
    }
    notifications.success(data.existing ? 'Movimiento actualizado' : 'Movimiento guardado');
    onDone();
  }

  async function remove(): Promise<void> {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    try {
      await repository.remove(id);
    } catch {
      setErrors({
        general: 'No pudimos eliminar el movimiento. Reintenta para verificar su estado.',
      });
      return;
    } finally {
      lock.current = false;
      setSaving(false);
    }
    notifications.success('Movimiento eliminado');
    onDone();
  }

  function confirmDelete(): void {
    Alert.alert(
      'Eliminar movimiento',
      'Se eliminará este registro y se recalculará el saldo de la cuenta. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void remove();
          },
        },
      ],
    );
  }

  return (
    <>
      <ChoiceGroup<MovementKind>
        label="Tipo de movimiento"
        value={draft.kind}
        options={kinds}
        disabled={saving}
        onChange={(kind) =>
          setDraft((current) => ({
            ...current,
            kind,
            categoryId: data.categories.find((category) => category.kind === kind)?.id ?? '',
          }))
        }
      />
      <Field
        label="Monto en pesos chilenos"
        placeholder="Por ejemplo, 25.000"
        value={draft.amount}
        onChangeText={(amount) => setDraft((current) => ({ ...current, amount }))}
        keyboardType="numbers-and-punctuation"
        maxLength={24}
        editable={!saving}
        error={errors.amount ?? ''}
        hint="Usa un monto positivo, sin decimales."
      />
      <Field
        label="Concepto"
        placeholder="Por ejemplo, Almuerzo"
        value={draft.description}
        onChangeText={(description) => setDraft((current) => ({ ...current, description }))}
        maxLength={120}
        editable={!saving}
        error={errors.description ?? ''}
      />
      <ChoiceGroup
        label="Cuenta"
        options={data.accounts.map((account) => ({ value: account.id, label: account.name }))}
        value={draft.accountId}
        disabled={saving}
        onChange={(accountId) => setDraft((current) => ({ ...current, accountId }))}
      />
      {errors.accountId ? (
        <Text accessibilityRole="alert" style={[screenStyles.body, { color: theme.danger }]}>
          {errors.accountId}
        </Text>
      ) : null}
      <ChoiceGroup
        label="Categoría"
        options={data.categories
          .filter((category) => category.kind === draft.kind)
          .map((category) => ({ value: category.id, label: category.name }))}
        value={draft.categoryId}
        disabled={saving}
        onChange={(categoryId) => setDraft((current) => ({ ...current, categoryId }))}
      />
      {errors.categoryId ? (
        <Text accessibilityRole="alert" style={[screenStyles.body, { color: theme.danger }]}>
          {errors.categoryId}
        </Text>
      ) : null}
      <Field
        label="Fecha"
        hint="AAAA-MM-DD. Puedes registrar movimientos de días anteriores."
        placeholder="2026-10-20"
        value={draft.date}
        onChangeText={(date) => setDraft((current) => ({ ...current, date }))}
        maxLength={10}
        autoCapitalize="none"
        editable={!saving}
        error={errors.date ?? ''}
      />
      {errors.general ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[screenStyles.body, { color: theme.danger }]}
        >
          {errors.general}
        </Text>
      ) : null}
      <Button
        label={saving ? 'Guardando…' : data.existing ? 'Guardar cambios' : 'Guardar movimiento'}
        disabled={saving}
        onPress={() => {
          void save();
        }}
      />
      <Button label="Cancelar" variant="secondary" disabled={saving} onPress={onDone} />
      {data.existing ? (
        <Button
          label="Eliminar movimiento"
          variant="secondary"
          disabled={saving}
          onPress={confirmDelete}
        />
      ) : null}
    </>
  );
}
