import { randomUUID } from 'expo-crypto';
import { useCallback, useRef, useState, type ReactElement } from 'react';
import { Alert, Text, View } from 'react-native';
import { businessDateAt } from '../../../shared/domain/business-date';
import { parseMoney } from '../../../shared/domain/money';
import { Amount } from '../../../shared/ui/amount';
import { Button } from '../../../shared/ui/button';
import { ChoiceGroup } from '../../../shared/ui/choice-group';
import { DateField } from '../../../shared/ui/date-field';
import { Field } from '../../../shared/ui/field';
import { MonthPicker } from '../../../shared/ui/month-picker';
import { notifications } from '../../../shared/ui/notifications';
import { ResourceFeedback } from '../../../shared/ui/resource-feedback';
import { Screen, screenStyles } from '../../../shared/ui/screen';
import { useTheme } from '../../../shared/ui/theme';
import { useFocusResource } from '../../../shared/ui/use-focus-resource';
import type { AccountRepository, ManagedAccount } from '../../accounts';
import {
  createTransfer,
  recordTransfer,
  type TransferRepository,
  type TransferInput,
  type TransferEntry,
  type TransferCursor,
} from '../index';

export interface TransfersScreenProps {
  readonly repository: TransferRepository;
  readonly accounts: AccountRepository;
  readonly onAccounts: () => void;
}
interface TransferFormProps {
  readonly repository: TransferRepository;
  readonly accounts: readonly ManagedAccount[];
  readonly onSaved: () => void;
  readonly disabled: boolean;
}

function TransferForm({
  repository,
  accounts,
  onSaved,
  disabled,
}: TransferFormProps): ReactElement {
  const theme = useTheme();
  const [id, setId] = useState(randomUUID);
  const [sourceId, setSourceId] = useState(accounts[0]?.id ?? '');
  const [destinationId, setDestinationId] = useState(accounts[1]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => businessDateAt(new Date(), 'America/Santiago').value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  async function save(): Promise<void> {
    if (lock.current || disabled) return;
    let input: TransferInput;
    const today = businessDateAt(new Date(), 'America/Santiago').value;
    try {
      input = createTransfer({
        id,
        sourceAccountId: sourceId,
        destinationAccountId: destinationId,
        amount: parseMoney(amount),
        description,
        date,
        createdAt: new Date().toISOString(),
      });
      if (date > today) throw new Error('future date');
    } catch {
      setError(
        'Revisa las cuentas, un monto positivo, el concepto y la fecha AAAA-MM-DD, sin fechas futuras.',
      );
      return;
    }
    lock.current = true;
    setSaving(true);
    setError('');
    try {
      await recordTransfer(repository, input, today);
      setId(randomUUID());
      setAmount('');
      setDescription('');
      notifications.success('Transferencia guardada');
      onSaved();
    } catch {
      setError(
        'No pudimos guardar. Comprueba que ambas cuentas sigan activas y reintenta. Los datos siguen en el formulario.',
      );
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  const busy = saving || disabled;
  return (
    <View style={screenStyles.section}>
      <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
        Nueva transferencia
      </Text>
      <Text style={[screenStyles.body, { color: theme.secondary }]}>
        Mueve dinero entre tus cuentas sin registrarlo como ingreso o gasto. Se permiten saldos
        negativos para reflejar deuda real.
      </Text>
      <ChoiceGroup
        label="Cuenta de origen"
        value={sourceId}
        options={accounts.map((account) => ({ value: account.id, label: account.name }))}
        disabled={busy}
        onChange={(value) => {
          setSourceId(value);
          if (destinationId === value)
            setDestinationId(accounts.find((account) => account.id !== value)?.id ?? '');
        }}
      />
      <ChoiceGroup
        label="Cuenta de destino"
        value={destinationId}
        options={accounts
          .filter((account) => account.id !== sourceId)
          .map((account) => ({ value: account.id, label: account.name }))}
        disabled={busy}
        onChange={setDestinationId}
      />
      <Field
        label="Monto en pesos chilenos"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        maxLength={24}
        editable={!busy}
      />
      <Field
        label="Concepto de la transferencia"
        value={description}
        onChangeText={setDescription}
        maxLength={120}
        editable={!busy}
      />
      <DateField
        label="Fecha"
        value={date}
        onChange={setDate}
        maximumDate={businessDateAt(new Date(), 'America/Santiago').value}
        editable={!busy}
        hint="La transferencia debe ser hoy o una fecha anterior."
      />
      {error ? (
        <Text accessibilityRole="alert" style={[screenStyles.body, { color: theme.danger }]}>
          {error}
        </Text>
      ) : null}
      <Button
        label={saving ? 'Guardando…' : 'Guardar transferencia'}
        disabled={busy}
        onPress={() => {
          void save();
        }}
      />
    </View>
  );
}

export function TransfersScreen({
  repository,
  accounts,
  onAccounts,
}: TransfersScreenProps): ReactElement {
  const theme = useTheme();
  const [month, setMonth] = useState(() =>
    businessDateAt(new Date(), 'America/Santiago').value.slice(0, 7),
  );
  const [accountId, setAccountId] = useState('');
  const [cursors, setCursors] = useState<readonly TransferCursor[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const cursor = cursors.at(-1);
  const read = useCallback(async () => {
    const [options, page] = await Promise.all([
      accounts.listManaged(),
      repository.list({
        month,
        ...(accountId ? { accountId } : {}),
        ...(cursor ? { cursor } : {}),
      }),
    ]);
    return { options, page };
  }, [accounts, repository, month, accountId, cursor]);
  const { state, reload } = useFocusResource(read, `${month}:${accountId}:${cursor?.id ?? ''}`);
  async function reverse(transfer: TransferEntry): Promise<void> {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await repository.reverse(transfer.id, new Date().toISOString());
      reload();
      notifications.success('Transferencia anulada');
    } catch {
      setError('No pudimos anular la transferencia. Reintenta para comprobar su estado.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Screen title="Transferencias">
      <MonthPicker
        value={month}
        onChange={(value) => {
          setMonth(value);
          setCursors([]);
        }}
      />
      {error ? (
        <Text accessibilityRole="alert" style={[screenStyles.body, { color: theme.danger }]}>
          {error}
        </Text>
      ) : null}
      {state.status !== 'ready' ? (
        <ResourceFeedback status={state.status} retry={reload} />
      ) : (
        <>
          {state.data.options.filter((account) => !account.archived).length >= 2 ? (
            <TransferForm
              key={state.data.options
                .filter((account) => !account.archived)
                .map((account) => account.id)
                .join(':')}
              repository={repository}
              accounts={state.data.options.filter((account) => !account.archived)}
              onSaved={reload}
              disabled={busy}
            />
          ) : (
            <>
              <Text style={[screenStyles.body, { color: theme.secondary }]}>
                Necesitas dos cuentas activas para registrar una transferencia.
              </Text>
              <Button label="Administrar cuentas" variant="secondary" onPress={onAccounts} />
            </>
          )}
          <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
            Historial del mes
          </Text>
          <ChoiceGroup
            label="Filtrar por cuenta"
            value={accountId}
            options={[
              { value: '', label: 'Todas' },
              ...state.data.options.map((account) => ({
                value: account.id,
                label: account.name + (account.archived ? ' (archivada)' : ''),
              })),
            ]}
            onChange={(value) => {
              setAccountId(value);
              setCursors([]);
            }}
          />
          {state.data.page.entries.length === 0 ? (
            <Text style={[screenStyles.body, { color: theme.secondary }]}>
              No hay transferencias en este periodo con estos filtros.
            </Text>
          ) : null}
          {state.data.page.entries.map((transfer) => (
            <View key={transfer.id} style={[screenStyles.card, { backgroundColor: theme.surface }]}>
              <Text style={[screenStyles.heading, { color: theme.text }]}>
                {transfer.sourceName} → {transfer.destinationName}
              </Text>
              <Text style={[screenStyles.body, { color: theme.text }]}>{transfer.description}</Text>
              <Amount value={transfer.amount} />
              <Text style={[screenStyles.caption, { color: theme.secondary }]}>
                {transfer.date} ·{' '}
                {transfer.reversedAt
                  ? 'Anulada · sin efecto en saldos'
                  : 'Transferencia entre cuentas'}
              </Text>
              {!transfer.reversedAt ? (
                <Button
                  label="Anular transferencia"
                  variant="secondary"
                  disabled={busy}
                  onPress={() =>
                    Alert.alert(
                      'Anular transferencia',
                      'Se revertirá su efecto en ambas cuentas. El registro quedará visible como anulado.',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Anular',
                          style: 'destructive',
                          onPress: () => {
                            void reverse(transfer);
                          },
                        },
                      ],
                    )
                  }
                />
              ) : null}
            </View>
          ))}
          {cursors.length ? (
            <Button
              label="Página anterior"
              variant="secondary"
              onPress={() => setCursors((previous) => previous.slice(0, -1))}
            />
          ) : null}
          {state.data.page.nextCursor ? (
            <Button
              label="Página siguiente"
              variant="secondary"
              onPress={() => {
                const next = state.data.page.nextCursor;
                if (next) setCursors((previous) => [...previous, next]);
              }}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}
