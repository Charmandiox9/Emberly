import { describe, expect, it } from 'vitest';
import {
  buildStatistics,
  chartPercentage,
  statisticsMonths,
  type MonthlyCategoryTotal,
} from '../../src/modules/statistics';
import { createMoney } from '../../src/shared/domain/money';
import { historyFilters } from '../../src/modules/movements';

const expense: MonthlyCategoryTotal = {
  month: '2026-10',
  kind: 'expense',
  categoryId: 'food',
  categoryName: 'Alimentación',
  total: createMoney(1000),
  count: 1,
};
describe('estadísticas', () => {
  it('construye seis meses incluyendo meses vacíos y cruces de año', () => {
    expect(statisticsMonths('2026-02')).toEqual([
      '2025-09',
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
    const report = buildStatistics('2026-10', []);
    expect(report.trend).toHaveLength(6);
    expect(report.current.net.amountMinor).toBe(0);
    expect(report.current.count).toBe(0);
    expect(report.incomeChange?.direction).toBe('equal');
    expect(report.categories).toEqual([]);
    expect(report.chartMaximum.amountMinor).toBe(0);
  });
  it('no inventa un mes anterior al inicio del calendario', () => {
    expect(statisticsMonths('0001-02')).toEqual(['0001-01', '0001-02']);
    const report = buildStatistics('0001-01', []);
    expect(report.previous).toBeNull();
    expect(report.expenseChange).toBeNull();
    expect(report.trend).toHaveLength(1);
    for (const month of ['0000-01', '9999-12', '2026-13', '2026-2'])
      expect(() => statisticsMonths(month)).toThrow();
  });
  it('calcula variaciones en pesos con base cero y participaciones enteras', () => {
    const report = buildStatistics('2026-10', [
      expense,
      { ...expense, categoryId: 'transport', total: createMoney(2000) },
      { ...expense, month: '2026-09', total: createMoney(5000) },
    ]);
    expect(report.current.expenses.amountMinor).toBe(3000);
    expect(report.current.net.amountMinor).toBe(-3000);
    expect(report.expenseChange?.direction).toBe('down');
    expect(report.expenseChange?.amount.amountMinor).toBe(2000);
    expect(report.categories.map((category) => category.percentage)).toEqual([66, 33]);
    const fromZero = buildStatistics('2026-10', [expense]);
    expect(fromZero.expenseChange?.direction).toBe('up');
    expect(fromZero.expenseChange?.amount.amountMinor).toBe(1000);
    expect(fromZero.incomeChange?.direction).toBe('equal');
  });
  it('mantiene precisión en proporciones y rechaza totales o filas fuera de rango', () => {
    const maximum = createMoney(Number.MAX_SAFE_INTEGER);
    expect(chartPercentage(createMoney(Number.MAX_SAFE_INTEGER - 1), maximum)).toBe(99);
    expect(chartPercentage(maximum, maximum)).toBe(100);
    expect(chartPercentage(createMoney(0), createMoney(0))).toBe(0);
    expect(() => chartPercentage(createMoney(2), createMoney(1))).toThrow();
    expect(() =>
      buildStatistics('2026-10', [
        { ...expense, total: maximum },
        { ...expense, categoryId: 'extra' },
      ]),
    ).toThrow('rango seguro');
    expect(() => buildStatistics('2026-10', [{ ...expense, month: '2026-01' }])).toThrow();
    expect(() => buildStatistics('2026-10', [{ ...expense, count: 0 }])).toThrow();
  });
});
describe('filtros del historial desde estadísticas', () => {
  it('conserva mes, tipo y categoría válidos y omite parámetros ausentes', () => {
    expect(historyFilters({ month: '2024-02', kind: 'expense', categoryId: 'food' })).toEqual({
      month: '2024-02',
      kind: 'expense',
      categoryId: 'food',
    });
    expect(historyFilters({ month: '2026-10', kind: 'income' })).toEqual({
      month: '2026-10',
      kind: 'income',
    });
    expect(historyFilters({})).toEqual({});
  });
  it('ignora entradas de ruta inválidas sin romper la pantalla', () => {
    expect(historyFilters({ month: ['2026-10'], kind: 'transfer', categoryId: ' ' })).toEqual({});
    expect(
      historyFilters({ month: '2026-99', kind: ['income'], categoryId: 'a'.repeat(129) }),
    ).toEqual({});
  });
});
