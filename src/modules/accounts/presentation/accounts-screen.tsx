import { randomUUID } from 'expo-crypto';
import { useCallback, useRef, useState, type ReactElement } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { businessDateAt } from '../../../shared/domain/business-date';
import { parseMoney, type Money } from '../../../shared/domain/money';
import { Amount, usePrivacy } from '../../../shared/ui/amount';
import { Button } from '../../../shared/ui/button';
import { Field } from '../../../shared/ui/field';
import { notifications } from '../../../shared/ui/notifications';
import { ResourceFeedback } from '../../../shared/ui/resource-feedback';
import { Screen, screenStyles } from '../../../shared/ui/screen';
import { typography, useTheme } from '../../../shared/ui/theme';
import { AppIcon, IconButton } from '../../../shared/ui/icon-button';
import { useFocusResource } from '../../../shared/ui/use-focus-resource';
import type { FinanceRepository } from '../../movements';
import { openAccount, type AccountRepository, type ManagedAccount } from '../index';

export interface AccountsScreenProps {
  readonly repository: AccountRepository;
  readonly finance: FinanceRepository;
  readonly onMovements: (accountId: string) => void;
}

export function AccountsScreen({
  repository,
  finance,
  onMovements,
}: AccountsScreenProps): ReactElement {
  const theme = useTheme();
  const { hidden, toggle } = usePrivacy();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
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
    setFormVisible(false);
    setEditingId(null);
    setName('');
    setBalance('0');
    setError('');
  }
  function startCreate(): void {
    clear();
    setNewId(randomUUID());
    setFormVisible(true);
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
      <Button label="Cancelar" variant="secondary" disabled={saving} onPress={clear} />
    </View>
  );
  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
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
            {state.data.accounts.length === 0 ? (
              <Text style={[screenStyles.body, { color: theme.secondary }]}>
                Agrega tu primera cuenta para comenzar a registrar ingresos y gastos.
              </Text>
            ) : (
              <View style={styles.accountGrid}>
                {state.data.accounts.map((account) => {
                  const balanceNow =
                    state.data.overview.accounts.find((entry) => entry.id === account.id)
                      ?.balance ?? account.initialBalance;
                  return (
                    <View
                      key={account.id}
                      style={[styles.accountCard, { backgroundColor: theme.surface }]}
                    >
                      <View style={styles.accountTop}>
                        <View style={[styles.accountIcon, { backgroundColor: theme.background }]}>
                          <AppIcon name="wallet" color={theme.primary} size={22} />
                        </View>
                        {account.archived ? (
                          <Text style={[screenStyles.caption, { color: theme.secondary }]}>
                            Archivada
                          </Text>
                        ) : null}
                      </View>
                      <Text numberOfLines={1} style={[styles.accountName, { color: theme.text }]}>
                        {account.name}
                      </Text>
                      <Amount value={balanceNow} large />
                      <View style={styles.accountActions}>
                        <IconButton
                          icon="history"
                          label={`Ver movimientos de ${account.name}`}
                          onPress={() => onMovements(account.id)}
                          disabled={saving}
                          size={42}
                        />
                        <IconButton
                          icon="edit"
                          label={`Editar ${account.name}`}
                          onPress={() => {
                            setEditingId(account.id);
                            setName(account.name);
                            setBalance(String(account.initialBalance.amountMinor));
                            setError('');
                            setFormVisible(true);
                          }}
                          disabled={saving}
                          size={42}
                        />
                        <IconButton
                          icon="archive"
                          label={`${account.archived ? 'Reactivar' : 'Archivar'} ${account.name}`}
                          onPress={() => confirmArchive(account)}
                          disabled={saving}
                          size={42}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </Screen>
      {state.status === 'ready' ? (
        <IconButton
          icon="add"
          label="Agregar cuenta"
          onPress={startCreate}
          primary
          size={56}
          style={styles.floatingAdd}
        />
      ) : null}
      <Modal
        visible={formVisible}
        transparent
        animationType="slide"
        onRequestClose={clear}
        statusBarTranslucent
      >
        <View style={styles.modalBackdrop}>
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>{editor}</View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  accountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  accountCard: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 142,
    borderRadius: 18,
    padding: 14,
    gap: 9,
  },
  accountTop: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountName: { fontFamily: typography.bold, fontSize: 15, lineHeight: 20 },
  accountActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  floatingAdd: { position: 'absolute', right: 22, bottom: 24, elevation: 5 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(25,16,10,0.48)',
    padding: 20,
  },
  modalScroll: { flexGrow: 1, justifyContent: 'center' },
  modalCard: { borderRadius: 24, padding: 20 },
});
