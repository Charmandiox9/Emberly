import { createBusinessDate } from '../../../shared/domain/business-date';
import {
  createTransfer,
  type TransferInput,
  type TransferPage,
  type TransferQuery,
} from '../domain/transfer';

export interface TransferRepository {
  save(input: TransferInput): Promise<void>;
  reverse(id: string, reversedAt: string): Promise<void>;
  list(query: TransferQuery): Promise<TransferPage>;
}
export async function recordTransfer(
  repository: TransferRepository,
  input: TransferInput,
  today: string,
): Promise<void> {
  createBusinessDate(today);
  const transfer = createTransfer(input);
  if (transfer.date > today) throw new Error('La fecha no puede estar en el futuro.');
  await repository.save(transfer);
}
