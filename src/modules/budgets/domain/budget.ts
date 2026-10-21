import { createMoney, type Money } from '../../../shared/domain/money';
import { monthRange } from '../../movements';

export interface Budget {
  readonly id: string;
  readonly categoryId: string;
  readonly month: string;
  readonly limit: Money;
  readonly createdAt: string;
}

export type BudgetStatus = 'available' | 'reached' | 'exceeded';

export interface BudgetProgress {
  readonly spent: Money;
  readonly remaining: Money;
  readonly excess: Money;
  readonly percentage: number;
  readonly status: BudgetStatus;
}

export function budgetLimit(input: Money): Money {
  const limit = createMoney(input.amountMinor, input.currency);
  if (limit.amountMinor <= 0) throw new Error('El límite debe ser mayor que cero.');
  return limit;
}

export function createBudget(input: Budget): Budget {
  for (const id of [input.id, input.categoryId]) {
    if (!id.trim() || id.length > 128) throw new Error('Identificador inválido.');
  }
  monthRange(input.month);
  const instant = new Date(input.createdAt);
  if (!Number.isFinite(instant.getTime()) || instant.toISOString() !== input.createdAt)
    throw new Error('La fecha de creación no es un instante UTC válido.');
  return Object.freeze({ ...input, limit: budgetLimit(input.limit) });
}

export function budgetProgress(limitInput: Money, spentInput: Money): BudgetProgress {
  const limit = budgetLimit(limitInput);
  const spent = createMoney(spentInput.amountMinor, spentInput.currency);
  if (spent.amountMinor < 0) throw new Error('El gasto acumulado no puede ser negativo.');
  const difference = limit.amountMinor - spent.amountMinor;
  return Object.freeze({
    spent,
    remaining: createMoney(Math.max(0, difference)),
    excess: createMoney(Math.max(0, -difference)),
    percentage: Math.min(
      100,
      Number((BigInt(spent.amountMinor) * 100n) / BigInt(limit.amountMinor)),
    ),
    status: difference < 0 ? 'exceeded' : difference === 0 ? 'reached' : 'available',
  });
}
