import { createBusinessDate } from '../../../shared/domain/business-date';
import { createMoney, type Money } from '../../../shared/domain/money';

export interface TransferInput {
  readonly id: string;
  readonly sourceAccountId: string;
  readonly destinationAccountId: string;
  readonly amount: Money;
  readonly description: string;
  readonly date: string;
  readonly createdAt: string;
}
export interface Transfer extends TransferInput {
  readonly reversedAt: string | null;
}
export interface TransferEntry extends Transfer {
  readonly sourceName: string;
  readonly destinationName: string;
}
export interface TransferCursor {
  readonly date: string;
  readonly id: string;
}
export interface TransferQuery {
  readonly month: string;
  readonly accountId?: string;
  readonly cursor?: TransferCursor;
  readonly limit?: number;
}
export interface TransferPage {
  readonly entries: readonly TransferEntry[];
  readonly nextCursor: TransferCursor | null;
}

export function validateInstant(instant: string): void {
  const value = new Date(instant);
  if (!Number.isFinite(value.getTime()) || value.toISOString() !== instant)
    throw new Error('Instante UTC inválido.');
}
export function createTransfer(input: TransferInput): Transfer {
  for (const id of [input.id, input.sourceAccountId, input.destinationAccountId])
    if (!id.trim() || id.length > 128) throw new Error('Identificador de transferencia inválido.');
  if (input.sourceAccountId === input.destinationAccountId)
    throw new Error('Elige cuentas de origen y destino diferentes.');
  const amount = createMoney(input.amount.amountMinor, input.amount.currency);
  if (amount.amountMinor <= 0) throw new Error('El monto debe ser mayor que cero.');
  const description = input.description.trim();
  if (!description || description.length > 120)
    throw new Error('Escribe un concepto de entre 1 y 120 caracteres.');
  createBusinessDate(input.date);
  validateInstant(input.createdAt);
  return Object.freeze({ ...input, amount, description, reversedAt: null });
}
