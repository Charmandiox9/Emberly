import { createMoney, type Money } from '../../../shared/domain/money';

export interface Account {
  readonly id: string;
  readonly name: string;
  readonly initialBalance: Money;
  readonly createdAt: string;
}

export interface CreateAccountInput {
  readonly id: string;
  readonly name: string;
  readonly initialBalance: Money;
  readonly createdAt: string;
}

export function createAccount(input: CreateAccountInput): Account {
  const name = input.name.trim();
  if (!name || name.length > 60) {
    throw new Error('El nombre debe tener entre 1 y 60 caracteres.');
  }
  if (!input.id.trim() || input.id.length > 128) {
    throw new Error('El identificador de cuenta no es válido.');
  }
  const createdAt = new Date(input.createdAt);
  if (!Number.isFinite(createdAt.getTime()) || createdAt.toISOString() !== input.createdAt) {
    throw new Error('La fecha de creación debe ser un instante ISO en UTC.');
  }
  return Object.freeze({
    id: input.id,
    name,
    initialBalance: createMoney(input.initialBalance.amountMinor, input.initialBalance.currency),
    createdAt: input.createdAt,
  });
}
