import { randomUUID } from 'expo-crypto';
import { useCallback, useRef, useState, type ReactElement } from 'react';
import { Alert, Text, View } from 'react-native';
import { businessDateAt } from '../../../shared/domain/business-date';
import { parseMoney, type Money } from '../../../shared/domain/money';
import { Amount, usePrivacy } from '../../../shared/ui/amount';
import { Button } from '../../../shared/ui/button';
import { Field } from '../../../shared/ui/field';
import { notifications } from '../../../shared/ui/notifications';
import { ResourceFeedback } from '../../../shared/ui/resource-feedback';
import { Screen, screenStyles } from '../../../shared/ui/screen';
import { useTheme } from '../../../shared/ui/theme';
import { useFocusResource } from '../../../shared/ui/use-focus-resource';
import type { FinanceRepository } from '../../movements';
import { openAccount, type AccountRepository, type ManagedAccount } from '../index';

export interface AccountsScreenProps {
  readonly repository: AccountRepository;
  readonly finance: FinanceRepository;
}

export function AccountsScreen({ repository, finance }: AccountsScreenProps): ReactElement {
  const theme = useTheme();
  const { hidden, toggle } = usePrivacy();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newId, setNewId] = useState(randomUUID);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('0');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const read = useCallback(async () => {
    const [accounts, overview] = await Promise.all([
      repository.listManaged(),
      finance.overview(businessDateAt(new Date(), 'America/Santiago').value.slice(0, 7)),
    ]);
    return { accounts, overview };
  }, [repository, finance]);
  const { state, reload } = useFocusResource(read, 'accounts');

  function clear(): void {
    setEditingId(null);
    setName('');
    setBalance('0');
    setError('');
  }
  async function save(): Promise<void> {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    setError('');
    try {
      if (!name.trim() || name.trim().length > 60) {
        setError('Escribe un nombre de entre 1 y 60 caracteres.');
        return;
      }
      let initialBalance: Money;
      try {
        initialBalance = parseMoney(balance);
      } catch {
        setError('Ingresa un saldo inicial entero válido, por ejemplo 25.000 o -5.000.');
        return;
      }
      if (editingId) await repository.update(editingId, { name, initialBalance });
      else
        await openAccount(repository, {
          id: newId,
          name,
          initialBalance,
          createdAt: new Date().toISOString(),
        });
      notifications.success(editingId ? 'Cuenta actualizada' : 'Cuenta guardada');
      clear();
      setNewId(randomUUID());
      reload();
    } catch {
      setError(
        'No pudimos guardar la cuenta. Revisa los valores y reintenta; tus datos siguen en el formulario.',
      );
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  async function archive(account: ManagedAccount): Promise<void> {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    setError('');
    try {
      await repository.setArchived(account.id, !account.archived);
      reload();
      notifications.success(account.archived ? 'Cuenta reactivada' : 'Cuenta archivada');
    } catch {
      setError('No pudimos cambiar el estado de la cuenta. Reintenta.');
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  function confirmArchive(account: ManagedAccount): void {
    if (account.archived) {
      void archive(account);
      return;
    }
    Alert.alert(
      'Archivar cuenta',
      'Conservará su historial y su saldo seguirá en el total. No podrás usarla en operaciones nuevas hasta reactivarla.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar',
          onPress: () => {
            void archive(account);
          },
        },
      ],
    );
  }
  const editor = (
    <View style={screenStyles.section}>
      <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
        {editingId ? 'Editar cuenta' : 'Agregar cuenta'}
      </Text>
      <Text style={[screenStyles.body, { color: theme.secondary }]}>
        {editingId
          ? 'Cambiar el saldo inicial corrige el punto de partida y modifica el saldo actual. No registra un ingreso ni un gasto.'
          : 'Agrega un banco, una billetera o efectivo. El saldo inicial puede ser negativo y no cuenta como ingreso.'}
      </Text>
      <Field
        label="Nombre de la cuenta"
        value={name}
        onChangeText={setName}
        maxLength={60}
        editable={!saving}
      />
      <Field
        label="Saldo inicial en pesos chilenos"
        value={balance}
        onChangeText={setBalance}
        keyboardType="numbers-and-punctuation"
        maxLength={24}
        editable={!saving}
      />
      {error ? (
        <Text accessibilityRole="alert" style={[screenStyles.body, { color: theme.danger }]}>
          {error}
        </Text>
      ) : null}
      <Button
        label={saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Guardar cuenta'}
        disabled={saving}
        onPress={() => {
          void save();
        }}
      />
      {editingId ? (
        <Button label="Cancelar edición" variant="secondary" disabled={saving} onPress={clear} />
      ) : null}
    </View>
  );
  return (
    <Screen title="Tus cuentas">
      {state.status !== 'ready' ? (
        <ResourceFeedback status={state.status} retry={reload} />
      ) : (
        <>
          <View style={[screenStyles.card, { backgroundColor: theme.surface }]}>
            <Text style={[screenStyles.heading, { color: theme.text }]}>
              Saldo actual total · CLP
            </Text>
            <Amount value={state.data.overview.balance} large />
            <Text style={[screenStyles.body, { color: theme.secondary }]}>
              Incluye los saldos de las cuentas archivadas.
            </Text>
            <Button
              variant="secondary"
              label={hidden ? 'Mostrar montos' : 'Ocultar montos'}
              onPress={toggle}
            />
          </View>
          {state.data.accounts.map((account) => (
            <View key={account.id} style={[screenStyles.card, { backgroundColor: theme.surface }]}>
              <Text style={[screenStyles.heading, { color: theme.text }]}>{account.name}</Text>
              <Text style={[screenStyles.caption, { color: theme.secondary }]}>
                {account.archived ? 'Archivada' : 'Activa'} · Saldo inicial
              </Text>
              <Amount value={account.initialBalance} />
              <Text style={[screenStyles.caption, { color: theme.secondary }]}>Saldo actual</Text>
              <Amount
                value={
                  state.data.overview.accounts.find((entry) => entry.id === account.id)?.balance ??
                  account.initialBalance
                }
              />
              <Button
                variant="secondary"
                label={`Editar: ${account.name}`}
                disabled={saving}
                onPress={() => {
                  setEditingId(account.id);
                  setName(account.name);
                  setBalance(String(account.initialBalance.amountMinor));
                  setError('');
                }}
              />
              <Button
                variant="secondary"
                label={`${account.archived ? 'Reactivar' : 'Archivar'}: ${account.name}`}
                disabled={saving}
                onPress={() => confirmArchive(account)}
              />
              {editingId === account.id ? editor : null}
            </View>
          ))}
          {!editingId ? editor : null}
        </>
      )}
    </Screen>
  );
}
