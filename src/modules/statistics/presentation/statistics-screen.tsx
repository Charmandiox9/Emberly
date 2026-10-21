import { useCallback, useState, type ReactElement } from 'react';
import { Text, View } from 'react-native';
import { businessDateAt } from '../../../shared/domain/business-date';
import type { Money } from '../../../shared/domain/money';
import { Amount, usePrivacy } from '../../../shared/ui/amount';
import { Button } from '../../../shared/ui/button';
import { MonthPicker } from '../../../shared/ui/month-picker';
import { Progress } from '../../../shared/ui/progress';
import { ResourceFeedback } from '../../../shared/ui/resource-feedback';
import { Screen, screenStyles } from '../../../shared/ui/screen';
import { useTheme } from '../../../shared/ui/theme';
import { useFocusResource } from '../../../shared/ui/use-focus-resource';
import type { HistoryFilters } from '../../movements';
import { chartPercentage, type AmountChange, type StatisticsRepository } from '../index';

interface StatisticsScreenProps {
  readonly repository: StatisticsRepository;
  readonly onReview: () => Promise<void>;
  readonly onHistory: (filters: HistoryFilters) => void;
}
interface ComparisonProps {
  readonly label: string;
  readonly current: Money;
  readonly previous: Money;
  readonly change: AmountChange;
}
function monthLabel(month: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${month}-15T12:00:00Z`));
}
function Comparison({ label, current, previous, change }: ComparisonProps): ReactElement {
  const theme = useTheme();
  return (
    <View style={[screenStyles.card, { backgroundColor: theme.surface }]}>
      <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
        {label}
      </Text>
      <Text style={[screenStyles.caption, { color: theme.secondary }]}>Mes seleccionado</Text>
      <Amount value={current} />
      <Text style={[screenStyles.caption, { color: theme.secondary }]}>Mes anterior</Text>
      <Amount value={previous} />
      <Text style={[screenStyles.body, { color: theme.text }]}>
        {change.direction === 'equal'
          ? 'Sin variación'
          : change.direction === 'up'
            ? 'Aumento frente al mes anterior'
            : 'Disminución frente al mes anterior'}
      </Text>
      <Amount value={change.amount} />
    </View>
  );
}

export function StatisticsScreen({
  repository,
  onReview,
  onHistory,
}: StatisticsScreenProps): ReactElement {
  const theme = useTheme();
  const { hidden, toggle } = usePrivacy();
  const [month, setMonth] = useState(() =>
    businessDateAt(new Date(), 'America/Santiago').value.slice(0, 7),
  );
  const read = useCallback(() => {
    void onReview().catch(() => undefined);
    return repository.read(month);
  }, [onReview, repository, month]);
  const { state, reload } = useFocusResource(read, month);
  return (
    <Screen title="Tu mes en números">
      <MonthPicker value={month} onChange={setMonth} />
      <Button
        label={hidden ? 'Mostrar montos' : 'Ocultar montos'}
        variant="secondary"
        onPress={toggle}
      />
      {state.status !== 'ready' ? (
        <ResourceFeedback status={state.status} retry={reload} />
      ) : (
        <>
          <View style={[screenStyles.card, { backgroundColor: theme.surface }]}>
            <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
              Resultado del mes
            </Text>
            <Amount value={state.data.current.net} large />
            <Text style={[screenStyles.caption, { color: theme.secondary }]}>
              Ingresos menos gastos registrados. Excluye saldos iniciales, transferencias y
              asignaciones a metas.
            </Text>
            <Text style={[screenStyles.body, { color: theme.secondary }]}>
              {state.data.current.count === 0
                ? 'Sin movimientos registrados en este mes.'
                : `${state.data.current.count} movimientos registrados en este mes.`}
            </Text>
            <Text style={[screenStyles.heading, { color: theme.text }]}>Ingresos</Text>
            <Amount value={state.data.current.income} />
            <Button
              label="Ver ingresos del mes"
              variant="secondary"
              onPress={() => onHistory({ month, kind: 'income' })}
            />
            <Text style={[screenStyles.heading, { color: theme.text }]}>Gastos</Text>
            <Amount value={state.data.current.expenses} />
            <Button
              label="Ver gastos del mes"
              variant="secondary"
              onPress={() => onHistory({ month, kind: 'expense' })}
            />
          </View>
          <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
            Comparación mensual
          </Text>
          <Text style={[screenStyles.body, { color: theme.secondary }]}>
            Se comparan los registros de cada mes. El mes actual puede estar incompleto; esta
            comparación no es una proyección.
          </Text>
          {state.data.previous && state.data.incomeChange && state.data.expenseChange ? (
            <>
              <Text style={[screenStyles.body, { color: theme.secondary }]}>
                Comparado con {monthLabel(state.data.previous.month)}.
                {state.data.previous.count === 0
                  ? ' Ese mes no tiene movimientos registrados; su base es cero.'
                  : ''}
              </Text>
              <Comparison
                label="Variación de ingresos"
                current={state.data.current.income}
                previous={state.data.previous.income}
                change={state.data.incomeChange}
              />
              <Comparison
                label="Variación de gastos"
                current={state.data.current.expenses}
                previous={state.data.previous.expenses}
                change={state.data.expenseChange}
              />
            </>
          ) : (
            <Text style={[screenStyles.body, { color: theme.secondary }]}>
              Este es el primer mes del calendario admitido; no hay un mes anterior para comparar.
            </Text>
          )}
          <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
            Gastos por categoría
          </Text>
          <Text style={[screenStyles.caption, { color: theme.secondary }]}>
            Incluye registros de cuentas y categorías archivadas. Porcentajes aproximados del gasto
            del mes.
          </Text>
          {state.data.categories.length === 0 ? (
            <Text style={[screenStyles.body, { color: theme.secondary }]}>
              Cuando registres gastos, podrás comparar aquí tus categorías.
            </Text>
          ) : (
            state.data.categories.map((category) => (
              <View
                key={category.id}
                style={[screenStyles.card, { backgroundColor: theme.surface }]}
              >
                <Text style={[screenStyles.heading, { color: theme.text }]}>{category.name}</Text>
                <Amount value={category.total} />
                {!hidden ? (
                  <>
                    <Text style={[screenStyles.caption, { color: theme.secondary }]}>
                      {category.percentage === 0 ? 'Menos del 1' : category.percentage} % del gasto
                      registrado
                    </Text>
                    <Progress
                      label={`Participación de ${category.name} en los gastos`}
                      percentage={category.percentage}
                    />
                  </>
                ) : null}
                <Button
                  label={`Ver gastos: ${category.name}`}
                  variant="secondary"
                  onPress={() => onHistory({ month, kind: 'expense', categoryId: category.id })}
                />
              </View>
            ))
          )}
          <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
            Tendencia de hasta seis meses
          </Text>
          <Text style={[screenStyles.caption, { color: theme.secondary }]}>
            Escala común según el mayor ingreso o gasto mensual de este periodo. Las barras
            acompañan los importes; no representan un porcentaje de tu saldo.
          </Text>
          {state.data.trend.map((period) => (
            <View
              key={period.month}
              style={[screenStyles.card, { backgroundColor: theme.surface }]}
            >
              <Text
                accessibilityRole="header"
                style={[screenStyles.heading, { color: theme.text }]}
              >
                {monthLabel(period.month)}
              </Text>
              {period.count === 0 ? (
                <Text style={[screenStyles.caption, { color: theme.secondary }]}>
                  Sin movimientos registrados
                </Text>
              ) : null}
              <Text style={[screenStyles.caption, { color: theme.secondary }]}>Ingresos</Text>
              <Amount value={period.income} />
              {!hidden ? (
                <Progress
                  label={`Ingresos de ${monthLabel(period.month)} en la escala común`}
                  percentage={chartPercentage(period.income, state.data.chartMaximum)}
                />
              ) : null}
              <Text style={[screenStyles.caption, { color: theme.secondary }]}>Gastos</Text>
              <Amount value={period.expenses} />
              {!hidden ? (
                <Progress
                  label={`Gastos de ${monthLabel(period.month)} en la escala común`}
                  percentage={chartPercentage(period.expenses, state.data.chartMaximum)}
                />
              ) : null}
              <Text style={[screenStyles.caption, { color: theme.secondary }]}>Resultado</Text>
              <Amount value={period.net} />
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}
