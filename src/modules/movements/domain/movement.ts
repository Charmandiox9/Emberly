import { createBusinessDate } from '../../../shared/domain/business-date';
import { createMoney, type Money } from '../../../shared/domain/money';

export type MovementKind = 'income' | 'expense';

export interface Category {
  readonly id: string;
  readonly name: string;
  readonly kind: MovementKind;
}

export interface Movement {
  readonly id: string;
  readonly accountId: string;
  readonly categoryId: string;
  readonly kind: MovementKind;
  readonly amount: Money;
  readonly description: string;
  readonly date: string;
  readonly createdAt: string;
}

export function createMovement(input: Movement): Movement {
  for (const identifier of [input.id, input.accountId, input.categoryId]) {
    if (!identifier.trim() || identifier.length > 128) throw new Error('Identificador inválido.');
  }
  if (input.kind !== 'income' && input.kind !== 'expense')
    throw new Error('Tipo de movimiento inválido.');
  const amount = createMoney(input.amount.amountMinor, input.amount.currency);
  if (amount.amountMinor <= 0) throw new Error('El monto debe ser mayor que cero.');
  const description = input.description.trim();
  if (!description || description.length > 120)
    throw new Error('Escribe un concepto de entre 1 y 120 caracteres.');
  createBusinessDate(input.date);
  const instant = new Date(input.createdAt);
  if (!Number.isFinite(instant.getTime()) || instant.toISOString() !== input.createdAt) {
    throw new Error('La fecha de creación no es un instante UTC válido.');
  }
  return Object.freeze({ ...input, amount, description });
}

export interface MonthRange {
  readonly start: string;
  readonly end: string;
}

export function monthRange(month: string): MonthRange {
  createBusinessDate(`${month}-01`);
  const year = Number(month.slice(0, 4));
  const number = Number(month.slice(5));
  const nextYear = number === 12 ? year + 1 : year;
  const nextMonth = number === 12 ? 1 : number + 1;
  return {
    start: `${month}-01`,
    end: createBusinessDate(
      `${String(nextYear).padStart(4, '0')}-${String(nextMonth).padStart(2, '0')}-01`,
    ).value,
  };
}
