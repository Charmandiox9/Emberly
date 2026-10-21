import { createMoney, moneyFromInteger, sumMoney, type Money } from '../../../shared/domain/money';
import { monthRange, type MovementKind } from '../../movements';

export interface MonthlyCategoryTotal {
  readonly month: string;
  readonly kind: MovementKind;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly total: Money;
  readonly count: number;
}
export interface PeriodTotals {
  readonly month: string;
  readonly income: Money;
  readonly expenses: Money;
  readonly net: Money;
  readonly count: number;
}
export interface AmountChange {
  readonly direction: 'up' | 'down' | 'equal';
  readonly amount: Money;
}
export interface CategoryShare {
  readonly id: string;
  readonly name: string;
  readonly total: Money;
  readonly percentage: number;
}
export interface StatisticsReport {
  readonly current: PeriodTotals;
  readonly previous: PeriodTotals | null;
  readonly incomeChange: AmountChange | null;
  readonly expenseChange: AmountChange | null;
  readonly trend: readonly PeriodTotals[];
  readonly categories: readonly CategoryShare[];
  readonly chartMaximum: Money;
}

export function statisticsMonths(month: string): readonly string[] {
  monthRange(month);
  const months = [month];
  let year = Number(month.slice(0, 4));
  let number = Number(month.slice(5));
  while (months.length < 6 && (year > 1 || number > 1)) {
    number--;
    if (number === 0) {
      year--;
      number = 12;
    }
    months.unshift(`${String(year).padStart(4, '0')}-${String(number).padStart(2, '0')}`);
  }
  return months;
}
export function chartPercentage(value: Money, maximum: Money): number {
  createMoney(value.amountMinor, value.currency);
  createMoney(maximum.amountMinor, maximum.currency);
  if (value.amountMinor < 0 || maximum.amountMinor < value.amountMinor)
    throw new Error('Escala de gráfico inválida.');
  return maximum.amountMinor === 0
    ? 0
    : Number((BigInt(value.amountMinor) * 100n) / BigInt(maximum.amountMinor));
}
function change(current: Money, previous: Money): AmountChange {
  const difference = current.amountMinor - previous.amountMinor;
  return {
    direction: difference > 0 ? 'up' : difference < 0 ? 'down' : 'equal',
    amount: createMoney(Math.abs(difference)),
  };
}
export function buildStatistics(
  month: string,
  rows: readonly MonthlyCategoryTotal[],
): StatisticsReport {
  const months = statisticsMonths(month);
  for (const row of rows) {
    if (
      !months.includes(row.month) ||
      (row.kind !== 'income' && row.kind !== 'expense') ||
      row.total.amountMinor <= 0 ||
      !Number.isSafeInteger(row.count) ||
      row.count < 1
    )
      throw new Error('Resumen mensual inválido.');
    createMoney(row.total.amountMinor, row.total.currency);
  }
  const trend = months.map((period): PeriodTotals => {
    const entries = rows.filter((row) => row.month === period);
    const income = sumMoney(entries.filter((row) => row.kind === 'income').map((row) => row.total));
    const expenses = sumMoney(
      entries.filter((row) => row.kind === 'expense').map((row) => row.total),
    );
    const count = entries.reduce((total, row) => total + row.count, 0);
    if (!Number.isSafeInteger(count)) throw new Error('El contador supera el rango seguro.');
    return {
      month: period,
      income,
      expenses,
      net: moneyFromInteger(BigInt(income.amountMinor) - BigInt(expenses.amountMinor)),
      count,
    };
  });
  const current = trend.at(-1);
  if (!current) throw new Error('No se pudo calcular el periodo.');
  const previous = trend.at(-2) ?? null;
  const categories = rows
    .filter((row) => row.month === month && row.kind === 'expense')
    .map((row): CategoryShare => ({
      id: row.categoryId,
      name: row.categoryName,
      total: row.total,
      percentage: chartPercentage(row.total, current.expenses),
    }))
    .sort((a, b) => b.total.amountMinor - a.total.amountMinor || a.id.localeCompare(b.id));
  return {
    current,
    previous,
    trend,
    categories,
    incomeChange: previous ? change(current.income, previous.income) : null,
    expenseChange: previous ? change(current.expenses, previous.expenses) : null,
    chartMaximum: createMoney(
      Math.max(...trend.flatMap((entry) => [entry.income.amountMinor, entry.expenses.amountMinor])),
    ),
  };
}
