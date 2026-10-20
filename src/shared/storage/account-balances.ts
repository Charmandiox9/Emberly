import { moneyFromInteger, type Money } from '../domain/money';
import type { DatabaseRow, SqlExecutor } from './database';

export interface StoredAccountBalance {
  readonly id: string;
  readonly name: string;
  readonly balance: Money;
}
function field(row: DatabaseRow, name: string): string {
  const value = row[name];
  if (typeof value !== 'string') throw new Error('La cuenta guardada contiene datos inválidos.');
  return value;
}
function integer(row: DatabaseRow, name: string): bigint {
  const value = field(row, name);
  if (!/^-?\d+$/.test(value)) throw new Error('El saldo guardado no es un entero.');
  return BigInt(value);
}
export async function readAccountBalances(
  database: SqlExecutor,
): Promise<readonly StoredAccountBalance[]> {
  const ledgerExists = await database.first(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'movements'",
  );
  const rows = await database.all(
    ledgerExists
      ? `SELECT a.id, a.name, a.currency,
    CAST(a.initial_balance_minor AS TEXT) AS initial,
    COALESCE(CAST(SUM(CASE WHEN m.kind = 'income' THEN m.amount_minor ELSE -m.amount_minor END) AS TEXT), '0') AS net
    FROM accounts a LEFT JOIN movements m ON m.account_id = a.id GROUP BY a.id ORDER BY a.created_at, a.id`
      : "SELECT id, name, currency, CAST(initial_balance_minor AS TEXT) AS initial, '0' AS net FROM accounts ORDER BY created_at, id",
  );
  return rows.map((row) => {
    if (row['currency'] !== 'CLP') throw new Error('Moneda guardada no admitida.');
    return {
      id: field(row, 'id'),
      name: field(row, 'name'),
      balance: moneyFromInteger(integer(row, 'initial') + integer(row, 'net')),
    };
  });
}
