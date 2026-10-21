import { createBusinessDate } from '../../../shared/domain/business-date';
import { createMoney, sumMoney } from '../../../shared/domain/money';
import { readAccountBalances } from '../../../shared/storage/account-balances';
import type { Database, DatabaseRow, SqlValue } from '../../../shared/storage/database';
import { monthRange } from '../../movements';
import type { TransferRepository } from '../application/transfer-repository';
import {
  createTransfer,
  validateInstant,
  type TransferInput,
  type TransferEntry,
  type TransferPage,
  type TransferQuery,
} from '../domain/transfer';

function text(row: DatabaseRow, key: string): string {
  const value = row[key];
  if (typeof value !== 'string') throw new Error('Transferencia guardada inválida.');
  return value;
}
function read(row: DatabaseRow): TransferEntry {
  const amount = row['amount_minor'];
  if (typeof amount !== 'number') throw new Error('Monto inválido.');
  const transfer = createTransfer({
    id: text(row, 'id'),
    sourceAccountId: text(row, 'source_account_id'),
    destinationAccountId: text(row, 'destination_account_id'),
    amount: createMoney(amount),
    description: text(row, 'description'),
    date: text(row, 'business_date'),
    createdAt: text(row, 'created_at'),
  });
  const reversedAt = row['reversed_at'] === null ? null : text(row, 'reversed_at');
  if (reversedAt) validateInstant(reversedAt);
  return {
    ...transfer,
    reversedAt,
    sourceName: text(row, 'source_name'),
    destinationName: text(row, 'destination_name'),
  };
}
export class SqliteTransferRepository implements TransferRepository {
  constructor(private readonly database: Database) {}
  async save(input: TransferInput): Promise<void> {
    const transfer = createTransfer(input);
    await this.database.transaction(async (transaction) => {
      await transaction.run(
        `INSERT INTO transfers (id, source_account_id, destination_account_id, amount_minor, description, business_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          transfer.id,
          transfer.sourceAccountId,
          transfer.destinationAccountId,
          transfer.amount.amountMinor,
          transfer.description,
          transfer.date,
          transfer.createdAt,
        ],
      );
      sumMoney((await readAccountBalances(transaction)).map((account) => account.balance));
    });
  }
  async reverse(id: string, reversedAt: string): Promise<void> {
    validateInstant(reversedAt);
    await this.database.transaction(async (transaction) => {
      const row = await transaction.first(
        'SELECT reversed_at, created_at FROM transfers WHERE id = ?',
        [id],
      );
      if (!row) throw new Error('La transferencia ya no existe.');
      if (row['reversed_at'] !== null) return;
      if (reversedAt < text(row, 'created_at'))
        throw new Error('La anulación no puede ser anterior al registro.');
      await transaction.run('UPDATE transfers SET reversed_at = ? WHERE id = ?', [reversedAt, id]);
      sumMoney((await readAccountBalances(transaction)).map((account) => account.balance));
    });
  }
  async list(query: TransferQuery): Promise<TransferPage> {
    const range = monthRange(query.month);
    const limit = query.limit ?? 30;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Límite inválido.');
    const conditions = ['t.business_date >= ?', 't.business_date < ?'];
    const params: SqlValue[] = [range.start, range.end];
    if (query.accountId) {
      conditions.push('(t.source_account_id = ? OR t.destination_account_id = ?)');
      params.push(query.accountId, query.accountId);
    }
    if (query.cursor) {
      createBusinessDate(query.cursor.date);
      conditions.push('(t.business_date < ? OR (t.business_date = ? AND t.id < ?))');
      params.push(query.cursor.date, query.cursor.date, query.cursor.id);
    }
    params.push(limit + 1);
    const rows = await this.database.all(
      `SELECT t.*, a.name AS source_name, b.name AS destination_name FROM transfers t
      JOIN accounts a ON a.id = t.source_account_id JOIN accounts b ON b.id = t.destination_account_id
      WHERE ${conditions.join(' AND ')} ORDER BY t.business_date DESC, t.id DESC LIMIT ?`,
      params,
    );
    const entries = rows.slice(0, limit).map(read);
    const last = entries.at(-1);
    return {
      entries,
      nextCursor: rows.length > limit && last ? { date: last.date, id: last.id } : null,
    };
  }
}
