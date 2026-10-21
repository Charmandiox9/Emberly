import { moneyFromInteger, type Money } from '../domain/money';
import type { DatabaseRow, SqlExecutor } from './database';

export interface StoredAccountBalance {
  readonly id: string;
  readonly name: string;
  readonly balance: Money;
  readonly archived: boolean;
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
  const transfersExist = await database.first(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'transfers'",
  );
  const archivedColumn = (await database.all('PRAGMA table_info(accounts)')).some(
    (row) => row['name'] === 'archived',
  );
  const transferNet = transfersExist
    ? `COALESCE(CAST((SELECT SUM(delta) FROM (
    SELECT -amount_minor AS delta FROM transfers WHERE source_account_id = a.id AND reversed_at IS NULL
    UNION ALL SELECT amount_minor AS delta FROM transfers WHERE destination_account_id = a.id AND reversed_at IS NULL
  )) AS TEXT), '0')`
    : "'0'";
  const rows = await database.all(
    ledgerExists
      ? `SELECT a.id, a.name, a.currency, ${archivedColumn ? 'a.archived' : '0'} AS archived,
    ${transferNet} AS transfer_net,
    CAST(a.initial_balance_minor AS TEXT) AS initial,
    COALESCE(CAST(SUM(CASE WHEN m.kind = 'income' THEN m.amount_minor ELSE -m.amount_minor END) AS TEXT), '0') AS net
    FROM accounts a LEFT JOIN movements m ON m.account_id = a.id GROUP BY a.id ORDER BY a.created_at, a.id`
      : "SELECT id, name, currency, 0 AS archived, '0' AS transfer_net, CAST(initial_balance_minor AS TEXT) AS initial, '0' AS net FROM accounts ORDER BY created_at, id",
  );
  return rows.map((row) => {
    if (row['currency'] !== 'CLP') throw new Error('Moneda guardada no admitida.');
    return {
      id: field(row, 'id'),
      name: field(row, 'name'),
      balance: moneyFromInteger(
        integer(row, 'initial') + integer(row, 'net') + integer(row, 'transfer_net'),
      ),
      archived: row['archived'] === 1,
    };
  });
}
