import { describe, expect, it } from 'vitest';
import { budgetProgress, createBudget, type Budget } from '../../src/modules/budgets';
import { createMoney } from '../../src/shared/domain/money';

const budget: Budget = {
  id: 'food-october',
  categoryId: 'food',
  month: '2026-10',
  limit: createMoney(50000),
  createdAt: '2026-10-20T12:00:00.000Z',
};

describe('presupuestos mensuales', () => {
  it.each([29, 57])('conserva el porcentaje entero exacto de %i sobre cien', (spent) => {
    expect(budgetProgress(createMoney(100), createMoney(spent)).percentage).toBe(spent);
  });
  it('valida mes, identidad, límite e instante de creación', () => {
    expect(createBudget(budget)).toEqual(budget);
    for (const month of ['2026-1', '2026-13', '0000-01', '9999-12'])
      expect(() => createBudget({ ...budget, month })).toThrow();
    for (const amount of [0, -1])
      expect(() => createBudget({ ...budget, limit: createMoney(amount) })).toThrow();
    expect(() => createBudget({ ...budget, id: ' ' })).toThrow();
    expect(() => createBudget({ ...budget, categoryId: 'a'.repeat(129) })).toThrow();
    expect(() => createBudget({ ...budget, createdAt: '2026-10-20' })).toThrow();
  });

  it('distingue disponible, límite alcanzado y exceso sin redondear montos', () => {
    const limit = createMoney(3000);
    const before = budgetProgress(limit, createMoney(1000));
    expect(before.remaining.amountMinor).toBe(2000);
    expect(before.excess.amountMinor).toBe(0);
    expect(before.percentage).toBe(33);
    expect(before.status).toBe('available');
    expect(budgetProgress(limit, limit).status).toBe('reached');
    const after = budgetProgress(limit, createMoney(4000));
    expect(after.remaining.amountMinor).toBe(0);
    expect(after.excess.amountMinor).toBe(1000);
    expect(after.percentage).toBe(100);
    expect(after.status).toBe('exceeded');
  });

  it('admite los extremos seguros y rechaza gasto negativo', () => {
    const extreme = budgetProgress(createMoney(1), createMoney(Number.MAX_SAFE_INTEGER));
    expect(extreme.excess.amountMinor).toBe(Number.MAX_SAFE_INTEGER - 1);
    expect(extreme.percentage).toBe(100);
    expect(
      budgetProgress(createMoney(Number.MAX_SAFE_INTEGER), createMoney(0)).remaining.amountMinor,
    ).toBe(Number.MAX_SAFE_INTEGER);
    expect(() => budgetProgress(createMoney(1), createMoney(-1))).toThrow();
  });
});
