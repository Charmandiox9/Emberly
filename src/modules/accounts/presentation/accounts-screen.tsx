import { randomUUID } from 'expo-crypto';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatMoney, parseMoney, type Money } from '../../../shared/domain/money';
import { Button } from '../../../shared/ui/button';
import { notifications } from '../../../shared/ui/notifications';
import { typography, useTheme } from '../../../shared/ui/theme';
import {
  getInitialBalanceTotal,
  openAccount,
  type Account,
  type AccountRepository,
} from '../index';

export interface AccountsScreenProps {
  readonly repository: AccountRepository;
}

type LoadState = 'loading' | 'ready' | 'error';

export function AccountsScreen({ repository }: AccountsScreenProps): ReactElement {
  const theme = useTheme();
  const [accounts, setAccounts] = useState<readonly Account[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState('');
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('0');
  const [formError, setFormError] = useState('');
  const [nameError, setNameError] = useState('');
  const [balanceError, setBalanceError] = useState('');
  const [saving, setSaving] = useState(false);
  const [hidden, setHidden] = useState(false);
  const savingLock = useRef(false);

  const readAccounts = useCallback(async (): Promise<readonly Account[]> => {
    const stored = await repository.list();
    getInitialBalanceTotal(stored);
    return stored;
  }, [repository]);

  const applyAccounts = useCallback((stored: readonly Account[]): void => {
    setAccounts(stored);
    setLoadError('');
    setLoadState('ready');
  }, []);

  const markLoadFailed = useCallback((): void => {
    setLoadError('No pudimos leer tus cuentas. Reintenta para consultar tus datos.');
    setLoadState('error');
  }, []);

  async function load(): Promise<void> {
    setLoadState('loading');
    try {
      applyAccounts(await readAccounts());
    } catch {
      markLoadFailed();
    }
  }

  useEffect(() => {
    let active = true;
    void readAccounts().then(
      (stored) => {
        if (active) applyAccounts(stored);
      },
      () => {
        if (active) markLoadFailed();
      },
    );
    return () => {
      active = false;
    };
  }, [readAccounts, applyAccounts, markLoadFailed]);

  async function save(): Promise<void> {
    if (savingLock.current || loadState !== 'ready') return;
    savingLock.current = true;
    setSaving(true);
    setFormError('');
    setNameError('');
    setBalanceError('');
    try {
      if (!name.trim() || name.trim().length > 60) {
        setNameError('Escribe un nombre de entre 1 y 60 caracteres.');
        return;
      }
      let initialBalance: Money;
      try {
        initialBalance = parseMoney(balance);
        getInitialBalanceTotal(accounts, initialBalance);
      } catch {
        setBalanceError(
          'Ingresa un monto entero válido, por ejemplo 25.000, dentro del rango seguro.',
        );
        return;
      }
      await openAccount(repository, {
        id: randomUUID(),
        name,
        initialBalance,
        createdAt: new Date().toISOString(),
      });
      setName('');
      setBalance('0');
      notifications.success('Cuenta guardada en este dispositivo');
      setLoadState('loading');
      await load();
    } catch {
      setFormError(
        'No pudimos guardar la cuenta. Tus datos ingresados siguen aquí para reintentar.',
      );
    } finally {
      savingLock.current = false;
      setSaving(false);
    }
  }

  const total = getInitialBalanceTotal(accounts);
  const fieldStyle = [
    styles.input,
    { color: theme.text, borderColor: theme.border, backgroundColor: theme.raised },
  ];

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={[styles.wordmark, { color: theme.text }]}>
              Emberly<Text style={{ color: theme.primary }}>.</Text>
            </Text>
            <Text style={[styles.caption, { color: theme.secondary }]}>
              Pequeños hábitos, grandes fuegos.
            </Text>
          </View>
          <View style={[styles.summary, { backgroundColor: theme.surface }]}>
            <Text style={[styles.eyebrow, { color: theme.secondary }]}>
              TU PUNTO DE PARTIDA · CLP
            </Text>
            {loadState === 'loading' ? (
              <ActivityIndicator accessibilityLabel="Cargando cuentas" color={theme.primary} />
            ) : loadState === 'error' ? (
              <>
                <Text accessibilityRole="alert" style={[styles.body, { color: theme.danger }]}>
                  {loadError}
                </Text>
                <Button
                  label="Volver a cargar"
                  onPress={() => {
                    setLoadState('loading');
                    void load();
                  }}
                />
              </>
            ) : (
              <>
                <Text style={[styles.amount, { color: theme.text }]}>
                  {hidden ? '••••••' : formatMoney(total)}
                </Text>
                <Text style={[styles.body, { color: theme.secondary }]}>
                  {accounts.length === 0
                    ? 'Cada plan empieza por saber dónde estás.'
                    : 'Saldo inicial total de tus cuentas.'}
                </Text>
                <Button
                  label={hidden ? 'Mostrar montos' : 'Ocultar montos'}
                  onPress={() => setHidden((value) => !value)}
                />
              </>
            )}
          </View>
          {accounts.length > 0 && loadState === 'ready' ? (
            <View style={styles.section}>
              <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>
                Tus cuentas
              </Text>
              {accounts.map((account) => (
                <View key={account.id} style={[styles.account, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.accountName, { color: theme.text }]}>{account.name}</Text>
                  <Text style={[styles.accountAmount, { color: theme.text }]}>
                    {hidden ? '••••••' : formatMoney(account.initialBalance)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.section}>
            <View style={styles.intro}>
              <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>
                {accounts.length === 0 ? 'Tu primera cuenta' : 'Agregar una cuenta'}
              </Text>
              <Text style={[styles.body, { color: theme.secondary }]}>
                Puede ser tu banco, una billetera o efectivo. El saldo inicial no cuenta como
                ingreso.
              </Text>
            </View>
            <View style={styles.field}>
              <Text nativeID="account-name-label" style={[styles.label, { color: theme.text }]}>
                Nombre de la cuenta
              </Text>
              <TextInput
                accessibilityLabel="Nombre de la cuenta"
                accessibilityLabelledBy="account-name-label"
                style={fieldStyle}
                value={name}
                onChangeText={setName}
                placeholder="Por ejemplo, Mi banco"
                placeholderTextColor={theme.secondary}
                maxLength={60}
                editable={!saving}
                autoCapitalize="sentences"
              />
              {nameError ? (
                <Text
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                  style={[styles.body, { color: theme.danger }]}
                >
                  {nameError}
                </Text>
              ) : null}
            </View>
            <View style={styles.field}>
              <Text nativeID="balance-label" style={[styles.label, { color: theme.text }]}>
                Saldo inicial en pesos chilenos
              </Text>
              <TextInput
                accessibilityLabel="Saldo inicial en pesos chilenos"
                accessibilityLabelledBy="balance-label"
                style={fieldStyle}
                value={balance}
                onChangeText={setBalance}
                keyboardType="numbers-and-punctuation"
                placeholder="25.000"
                placeholderTextColor={theme.secondary}
                editable={!saving}
                selectTextOnFocus
                maxLength={24}
              />
              <Text style={[styles.caption, { color: theme.secondary }]}>
                Sin decimales. Si tienes deuda, puedes usar un monto negativo.
              </Text>
              {balanceError ? (
                <Text
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                  style={[styles.body, { color: theme.danger }]}
                >
                  {balanceError}
                </Text>
              ) : null}
            </View>
            {formError ? (
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={[styles.body, { color: theme.danger }]}
              >
                {formError}
              </Text>
            ) : null}
            <Button
              label={saving ? 'Guardando…' : 'Guardar cuenta'}
              disabled={saving || loadState !== 'ready'}
              onPress={() => {
                void save();
              }}
            />
          </View>
          <Text style={[styles.caption, { color: theme.secondary }]}>
            Tus datos se guardan aquí y funcionan sin conexión. Esta versión inicial aún no tiene
            respaldo; úsala con datos de prueba.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  fill: { flex: 1 },
  content: { padding: 20, gap: 32, paddingBottom: 40 },
  header: { gap: 4, paddingTop: 16 },
  wordmark: { fontFamily: typography.extraBold, fontSize: 32, lineHeight: 40 },
  summary: { borderRadius: 20, padding: 24, gap: 16 },
  eyebrow: { fontFamily: typography.bold, fontSize: 12, lineHeight: 20, letterSpacing: 1 },
  amount: {
    fontFamily: typography.extraBold,
    fontSize: 32,
    lineHeight: 40,
    fontVariant: ['tabular-nums'],
  },
  section: { gap: 16 },
  intro: { gap: 8 },
  sectionTitle: { fontFamily: typography.bold, fontSize: 24, lineHeight: 32 },
  body: { fontFamily: typography.regular, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: typography.regular, fontSize: 14, lineHeight: 20 },
  field: { gap: 8 },
  label: { fontFamily: typography.semibold, fontSize: 16, lineHeight: 24 },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontFamily: typography.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  account: { borderRadius: 12, padding: 16, gap: 8 },
  accountName: { fontFamily: typography.semibold, fontSize: 16, lineHeight: 24 },
  accountAmount: {
    fontFamily: typography.bold,
    fontSize: 20,
    lineHeight: 28,
    fontVariant: ['tabular-nums'],
  },
});
