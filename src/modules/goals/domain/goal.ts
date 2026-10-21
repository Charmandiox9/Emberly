import { createBusinessDate } from '../../../shared/domain/business-date';
import { createMoney, type Money } from '../../../shared/domain/money';

export interface GoalChanges {
  readonly name: string;
  readonly target: Money;
  readonly deadline: string | null;
}
export interface Goal extends GoalChanges {
  readonly id: string;
  readonly createdAt: string;
}
export type AllocationKind = 'contribute' | 'withdraw';
export interface GoalAllocation {
  readonly id: string;
  readonly goalId: string;
  readonly kind: AllocationKind;
  readonly amount: Money;
  readonly createdAt: string;
}

function identifier(value: string): void {
  if (!value.trim() || value.length > 128) throw new Error('Identificador inválido.');
}
function instant(value: string): void {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value)
    throw new Error('Fecha de auditoría inválida.');
}
function positive(input: Money): Money {
  const money = createMoney(input.amountMinor, input.currency);
  if (money.amountMinor <= 0) throw new Error('El monto debe ser mayor que cero.');
  return money;
}
export function goalChanges(input: GoalChanges): GoalChanges {
  const name = input.name.trim();
  if (!name || name.length > 60) throw new Error('Escribe un nombre de entre 1 y 60 caracteres.');
  if (input.deadline !== null) createBusinessDate(input.deadline);
  return Object.freeze({ name, target: positive(input.target), deadline: input.deadline });
}
export function createGoal(input: Goal): Goal {
  identifier(input.id);
  instant(input.createdAt);
  return Object.freeze({ id: input.id, createdAt: input.createdAt, ...goalChanges(input) });
}
export function createAllocation(input: GoalAllocation): GoalAllocation {
  identifier(input.id);
  identifier(input.goalId);
  instant(input.createdAt);
  if (input.kind !== 'contribute' && input.kind !== 'withdraw')
    throw new Error('Operación de meta inválida.');
  return Object.freeze({ ...input, amount: positive(input.amount) });
}
