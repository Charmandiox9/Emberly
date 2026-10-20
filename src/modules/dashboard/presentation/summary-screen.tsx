import { useCallback, useState, type ReactElement } from 'react';
import { Text, View } from 'react-native';
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
  readonly onEdit: (id: string) => void;
}

export function SummaryScreen({
  repository,
  mode,
  onAdd,
  onAccounts,
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
            <View style={[screenStyles.card, { backgroundColor: theme.surface }]}>
              <Text style={[screenStyles.caption, { color: theme.secondary }]}>
                SALDO ACTUAL · CLP
              </Text>
              <Amount value={state.data.overview.balance} large />
              <Text style={[screenStyles.caption, { color: theme.secondary }]}>
                Incluye saldos iniciales y todos los movimientos registrados.
              </Text>
              <Button
                label={hidden ? 'Mostrar montos' : 'Ocultar montos'}
                variant="secondary"
                onPress={toggle}
              />
            </View>
          ) : (
            <Button
              label={hidden ? 'Mostrar montos' : 'Ocultar montos'}
              variant="secondary"
              onPress={toggle}
            />
          )}
          <View style={[screenStyles.card, { backgroundColor: theme.surface }]}>
            <Text style={[screenStyles.heading, { color: theme.text }]}>Ingresos del mes</Text>
            <Amount value={state.data.overview.income} prefix="+" />
            <Text style={[screenStyles.heading, { color: theme.text }]}>Gastos del mes</Text>
            <Amount value={state.data.overview.expenses} prefix="−" />
          </View>
          {mode === 'home' ? (
            <>
              <Button
                label="Agregar movimiento"
                onPress={onAdd}
                disabled={state.data.overview.accounts.length === 0}
              />
              <Button
                label={
                  state.data.overview.accounts.length === 0
                    ? 'Crear mi primera cuenta'
                    : 'Administrar cuentas'
                }
                variant="secondary"
                onPress={onAccounts}
              />
              {state.data.overview.accounts.map((account) => (
                <View
                  key={account.id}
                  style={[screenStyles.card, { backgroundColor: theme.surface }]}
                >
                  <Text style={[screenStyles.heading, { color: theme.text }]}>{account.name}</Text>
                  <Amount value={account.balance} />
                </View>
              ))}
              <Text
                accessibilityRole="header"
                style={[screenStyles.heading, { color: theme.text }]}
              >
                Últimos movimientos del mes
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
