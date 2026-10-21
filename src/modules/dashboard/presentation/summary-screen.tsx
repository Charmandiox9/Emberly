import { useCallback, useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { businessDateAt } from '../../../shared/domain/business-date';
import { Amount, usePrivacy } from '../../../shared/ui/amount';
import { Button } from '../../../shared/ui/button';
import { MonthPicker } from '../../../shared/ui/month-picker';
import { ResourceFeedback } from '../../../shared/ui/resource-feedback';
import { Screen, screenStyles } from '../../../shared/ui/screen';
import { typography, useTheme } from '../../../shared/ui/theme';
import { useFocusResource } from '../../../shared/ui/use-focus-resource';
import type { FinanceRepository } from '../../movements';
import { MovementRow } from '../../movements/presentation';
import type { MovementKind } from '../../movements/domain/movement';
import type { EmberRepository } from '../../ember';
import { EmberProgressCard } from '../../ember/presentation/ember-progress-card';
import { readSummaryData } from '../application/read-summary';

export interface SummaryScreenProps {
  readonly repository: FinanceRepository;
  readonly emberRepository: EmberRepository;
  readonly mode: 'home' | 'statistics';
  readonly onAddKind: (kind: MovementKind) => void;
  readonly onAccounts: () => void;
  readonly onMovements: () => void;
  readonly onEdit: (id: string) => void;
}

export function SummaryScreen({
  repository,
  emberRepository,
  mode,
  onAddKind,
  onAccounts,
  onMovements,
  onEdit,
}: SummaryScreenProps): ReactElement {
  const theme = useTheme();
  const { hidden, toggle } = usePrivacy();
  const [month, setMonth] = useState(() =>
    businessDateAt(new Date(), 'America/Santiago').value.slice(0, 7),
  );
  const read = useCallback(async () => {
    return readSummaryData(repository, emberRepository, month, mode === 'home');
  }, [repository, emberRepository, month, mode]);
  const { state, reload } = useFocusResource(read, month);
  return (
    <Screen title={mode === 'home' ? 'Inicio' : 'Tu mes en números'}>
      {state.status !== 'ready' ? (
        <ResourceFeedback status={state.status} retry={reload} />
      ) : (
        <>
          {mode === 'home' && state.data.ember ? (
            <EmberProgressCard progress={state.data.ember} />
          ) : null}
          <MonthPicker value={month} onChange={setMonth} />
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
              <View style={styles.section}>
                <Text
                  accessibilityRole="header"
                  style={[screenStyles.heading, { color: theme.text }]}
                >
                  Acciones rápidas
                </Text>
                <View style={styles.quickActions}>
                  <QuickAction label="Agregar gasto" onPress={() => onAddKind('expense')} />
                  <QuickAction label="Agregar ingreso" onPress={() => onAddKind('income')} />
                  <QuickAction label="Ver cuentas" onPress={onAccounts} />
                </View>
              </View>
              <Text
                accessibilityRole="header"
                style={[screenStyles.heading, { color: theme.text }]}
              >
                Últimos gastos
              </Text>
              {state.data.recent.entries.length === 0 ? (
                <Text style={[screenStyles.body, { color: theme.secondary }]}>
                  Todavía no hay gastos en este periodo.
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
              <Button label="Ver gastos y movimientos" variant="secondary" onPress={onMovements} />
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
  section: { gap: 10 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickAction: {
    minHeight: 52,
    flexGrow: 1,
    flexBasis: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 16,
  },
  quickActionLabel: {
    fontFamily: typography.bold,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});

interface QuickActionProps {
  readonly label: string;
  readonly onPress: () => void;
}

function QuickAction({ label, onPress }: QuickActionProps): ReactElement {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.72 : 1 },
      ]}
    >
      <Text style={[styles.quickActionLabel, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}
