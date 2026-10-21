import { useCallback, useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { businessDateAt } from '../../../shared/domain/business-date';
import { Amount, usePrivacy } from '../../../shared/ui/amount';
import { Button } from '../../../shared/ui/button';
import { MonthPicker } from '../../../shared/ui/month-picker';
import { ResourceFeedback } from '../../../shared/ui/resource-feedback';
import { Screen, screenStyles } from '../../../shared/ui/screen';
import { useTheme } from '../../../shared/ui/theme';
import { useFocusResource } from '../../../shared/ui/use-focus-resource';
import type { FinanceRepository } from '../../movements';
import { MovementRow } from '../../movements/presentation';

export interface SummaryScreenProps {
  readonly repository: FinanceRepository;
  readonly mode: 'home' | 'statistics';
  readonly onAdd: () => void;
  readonly onAccounts: () => void;
  readonly onMore: () => void;
  readonly onEdit: (id: string) => void;
}

export function SummaryScreen({
  repository,
  mode,
  onAdd,
  onAccounts,
  onMore,
  onEdit,
}: SummaryScreenProps): ReactElement {
  const theme = useTheme();
  const { hidden, toggle } = usePrivacy();
  const [month, setMonth] = useState(() =>
    businessDateAt(new Date(), 'America/Santiago').value.slice(0, 7),
  );
  const read = useCallback(async () => {
    const [overview, recent] = await Promise.all([
      repository.overview(month),
      repository.list({ month, limit: 5 }),
    ]);
    return { overview, recent };
  }, [repository, month]);
  const { state, reload } = useFocusResource(read, month);
  return (
    <Screen title={mode === 'home' ? 'Emberly.' : 'Tu mes en números'}>
      <MonthPicker value={month} onChange={setMonth} />
      {state.status !== 'ready' ? (
        <ResourceFeedback status={state.status} retry={reload} />
      ) : (
        <>
          {mode === 'home' ? (
            <Animated.View
              entering={FadeInDown.duration(240).reduceMotion(ReduceMotion.System)}
              style={[screenStyles.card, styles.hero, { backgroundColor: theme.primary }]}
            >
              <View style={screenStyles.row}>
                <Text style={[screenStyles.caption, { color: theme.onPrimary }]}>
                  SALDO TOTAL · CLP
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={hidden ? 'Mostrar montos' : 'Ocultar montos'}
                  onPress={toggle}
                  style={styles.privacyButton}
                >
                  <Text style={[screenStyles.caption, { color: theme.onPrimary }]}>
                    {hidden ? 'Mostrar' : 'Ocultar'}
                  </Text>
                </Pressable>
              </View>
              <Amount value={state.data.overview.balance} large color={theme.onPrimary} />
              <Text style={[screenStyles.caption, { color: theme.onPrimary, opacity: 0.85 }]}>
                Tus cuentas activas, en un solo lugar.
              </Text>
            </Animated.View>
          ) : (
            <Button
              label={hidden ? 'Mostrar montos' : 'Ocultar montos'}
              variant="secondary"
              onPress={toggle}
            />
          )}
          <View
            style={[screenStyles.card, styles.monthSummary, { backgroundColor: theme.surface }]}
          >
            <View style={styles.metric}>
              <Text style={[screenStyles.caption, { color: theme.secondary }]}>INGRESOS</Text>
              <Amount value={state.data.overview.income} prefix="+" />
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.metric}>
              <Text style={[screenStyles.caption, { color: theme.secondary }]}>GASTOS</Text>
              <Amount value={state.data.overview.expenses} prefix="−" />
            </View>
          </View>
          {mode === 'home' ? (
            <>
              <Button
                label={
                  state.data.overview.accounts.some((account) => !account.archived)
                    ? 'Agregar movimiento'
                    : 'Crear mi primera cuenta'
                }
                onPress={
                  state.data.overview.accounts.some((account) => !account.archived)
                    ? onAdd
                    : onAccounts
                }
              />
              <Pressable
                accessibilityRole="button"
                onPress={onMore}
                style={({ pressed }) => [styles.moreLink, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[screenStyles.caption, { color: theme.primary }]}>
                  Cuentas, presupuestos y ajustes · Ver más
                </Text>
              </Pressable>
              {state.data.overview.accounts.length > 0 ? (
                <View style={styles.section}>
                  <Text
                    accessibilityRole="header"
                    style={[screenStyles.heading, { color: theme.text }]}
                  >
                    Tus cuentas
                  </Text>
                  {state.data.overview.accounts.map((account) => (
                    <View
                      key={account.id}
                      style={[styles.accountRow, { backgroundColor: theme.surface }]}
                    >
                      <View style={styles.accountName}>
                        <Text style={[screenStyles.body, { color: theme.text }]}>
                          {account.name}
                        </Text>
                        {account.archived ? (
                          <Text style={[screenStyles.caption, { color: theme.secondary }]}>
                            Archivada
                          </Text>
                        ) : null}
                      </View>
                      <Amount value={account.balance} />
                    </View>
                  ))}
                </View>
              ) : null}
              <Text
                accessibilityRole="header"
                style={[screenStyles.heading, { color: theme.text }]}
              >
                Movimientos recientes
              </Text>
              {state.data.recent.entries.length === 0 ? (
                <Text style={[screenStyles.body, { color: theme.secondary }]}>
                  Aún no hay movimientos en este periodo.
                </Text>
              ) : (
                state.data.recent.entries.map((movement) => (
                  <MovementRow
                    key={movement.id}
                    movement={movement}
                    onPress={() => onEdit(movement.id)}
                  />
                ))
              )}
            </>
          ) : (
            <>
              <Text
                accessibilityRole="header"
                style={[screenStyles.heading, { color: theme.text }]}
              >
                Gastos por categoría
              </Text>
              {state.data.overview.expenseCategories.length === 0 ? (
                <Text style={[screenStyles.body, { color: theme.secondary }]}>
                  Cuando registres gastos, podrás comparar aquí tus categorías.
                </Text>
              ) : (
                state.data.overview.expenseCategories.map((category) => (
                  <View
                    key={category.id}
                    style={[screenStyles.card, { backgroundColor: theme.surface }]}
                  >
                    <Text style={[screenStyles.heading, { color: theme.text }]}>
                      {category.name}
                    </Text>
                    <Amount value={category.total} />
                  </View>
                ))
              )}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 24, padding: 24 },
  privacyButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  monthSummary: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18 },
  metric: { flex: 1, gap: 6 },
  divider: { width: 1, height: 42, marginHorizontal: 12 },
  moreLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  section: { gap: 10 },
  accountRow: {
    minHeight: 64,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  accountName: { flex: 1, gap: 2 },
});
