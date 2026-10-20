import { createBusinessDate } from '../../../shared/domain/business-date';
import { createMoney, moneyFromInteger, sumMoney } from '../../../shared/domain/money';
import { readAccountBalances } from '../../../shared/storage/account-balances';
import type {
  Database,
  DatabaseRow,
  SqlExecutor,
  SqlValue,
} from '../../../shared/storage/database';
import type {
  CategoryTotal,
  FinanceRepository,
  MovementEntry,
  MovementPage,
  MovementQuery,
  Overview,
} from '../application/finance-repository';
import {
  createMovement,
  monthRange,
  type Category,
  type Movement,
  type MovementKind,
} from '../domain/movement';

function text(row: DatabaseRow, column: string): string {
  const value = row[column];
  if (typeof value !== 'string') throw new Error('Los datos guardados no son válidos.');
  return value;
}

function kindOf(row: DatabaseRow): MovementKind {
  const kind = row['kind'];
  if (kind !== 'income' && kind !== 'expense') throw new Error('Tipo guardado inválido.');
  return kind;
}

function integerText(row: DatabaseRow, column: string): bigint {
  const value = text(row, column);
  if (!/^-?\d+$/.test(value)) throw new Error('Monto agregado inválido.');
  return BigInt(value);
}

function readMovement(row: DatabaseRow): MovementEntry {
  const amount = row['amount_minor'];
  if (typeof amount !== 'number') throw new Error('Monto guardado inválido.');
  const movement = createMovement({
    id: text(row, 'id'),
    accountId: text(row, 'account_id'),
    categoryId: text(row, 'category_id'),
    kind: kindOf(row),
    amount: createMoney(amount),
    description: text(row, 'description'),
    date: text(row, 'business_date'),
    createdAt: text(row, 'created_at'),
  });
  return {
    ...movement,
    accountName: text(row, 'account_name'),
    categoryName: text(row, 'category_name'),
  };
}

const selectEntries = `SELECT m.*, a.name AS account_name, c.name AS category_name
  FROM movements m JOIN accounts a ON a.id = m.account_id JOIN categories c ON c.id = m.category_id`;

async function readOverview(database: SqlExecutor, month: string): Promise<Overview> {
  const range = monthRange(month);
  const accounts = await readAccountBalances(database);
  const grouped = await database.all(
    `SELECT c.id, c.name, m.kind, CAST(SUM(m.amount_minor) AS TEXT) AS total
    FROM movements m JOIN categories c ON c.id = m.category_id
    WHERE m.business_date >= ? AND m.business_date < ? GROUP BY c.id, m.kind ORDER BY SUM(m.amount_minor) DESC, c.id`,
    [range.start, range.end],
  );
  const income = grouped
    .filter((row) => kindOf(row) === 'income')
    .map((row) => moneyFromInteger(integerText(row, 'total')));
  const expenseCategories: readonly CategoryTotal[] = grouped
    .filter((row) => kindOf(row) === 'expense')
    .map((row) => ({
      id: text(row, 'id'),
      name: text(row, 'name'),
      total: moneyFromInteger(integerText(row, 'total')),
    }));
  return {
    month,
    accounts,
    balance: sumMoney(accounts.map((account) => account.balance)),
    income: sumMoney(income),
    expenses: sumMoney(expenseCategories.map((category) => category.total)),
    expenseCategories,
  };
}

export class SqliteFinanceRepository implements FinanceRepository {
  constructor(private readonly database: Database) {}

  async categories(): Promise<readonly Category[]> {
    const rows = await this.database.all('SELECT id, name, kind FROM categories ORDER BY name');
    return rows.map((row) => ({ id: text(row, 'id'), name: text(row, 'name'), kind: kindOf(row) }));
  }

  async get(id: string): Promise<MovementEntry | null> {
    const row = await this.database.first(`${selectEntries} WHERE m.id = ?`, [id]);
    return row ? readMovement(row) : null;
  }

  async list(query: MovementQuery): Promise<MovementPage> {
    const range = monthRange(query.month);
    const limit = query.limit ?? 30;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new Error('Límite de consulta inválido.');
    const conditions = ['m.business_date >= ?', 'm.business_date < ?'];
    const params: SqlValue[] = [range.start, range.end];
    if (query.kind) {
      conditions.push('m.kind = ?');
      params.push(query.kind);
    }
    if (query.accountId) {
      conditions.push('m.account_id = ?');
      params.push(query.accountId);
    }
    if (query.categoryId) {
      conditions.push('m.category_id = ?');
      params.push(query.categoryId);
    }
    if (query.cursor) {
      createBusinessDate(query.cursor.date);
      conditions.push('(m.business_date < ? OR (m.business_date = ? AND m.id < ?))');
      params.push(query.cursor.date, query.cursor.date, query.cursor.id);
    }
    params.push(limit + 1);
    const rows = await this.database.all(
      `${selectEntries} WHERE ${conditions.join(' AND ')} ORDER BY m.business_date DESC, m.id DESC LIMIT ?`,
      params,
    );
    const entries = rows.slice(0, limit).map(readMovement);
    const last = entries.at(-1);
    return {
      entries,
      nextCursor: rows.length > limit && last ? { date: last.date, id: last.id } : null,
    };
  }

  async save(input: Movement): Promise<void> {
    const movement = createMovement(input);
    await this.database.transaction(async (transaction) => {
      await transaction.run(
        `INSERT INTO movements (id, account_id, category_id, kind, amount_minor, description, business_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          movement.id,
          movement.accountId,
          movement.categoryId,
          movement.kind,
          movement.amount.amountMinor,
          movement.description,
          movement.date,
          movement.createdAt,
        ],
      );
      await readOverview(transaction, movement.date.slice(0, 7));
    });
  }

  async update(input: Movement): Promise<void> {
    const movement = createMovement(input);
    await this.database.transaction(async (transaction) => {
      const existing = await transaction.first('SELECT business_date FROM movements WHERE id = ?', [
        movement.id,
      ]);
      if (!existing) throw new Error('El movimiento ya no existe.');
      await transaction.run(
        `UPDATE movements SET account_id = ?, category_id = ?, kind = ?, amount_minor = ?, description = ?, business_date = ? WHERE id = ?`,
        [
          movement.accountId,
          movement.categoryId,
          movement.kind,
          movement.amount.amountMinor,
          movement.description,
          movement.date,
          movement.id,
        ],
      );
      await readOverview(transaction, text(existing, 'business_date').slice(0, 7));
      await readOverview(transaction, movement.date.slice(0, 7));
    });
  }

  async remove(id: string): Promise<void> {
    await this.database.transaction(async (transaction) => {
      const existing = await transaction.first('SELECT business_date FROM movements WHERE id = ?', [
        id,
      ]);
      if (!existing) throw new Error('El movimiento ya no existe.');
      await transaction.run('DELETE FROM movements WHERE id = ?', [id]);
      await readOverview(transaction, text(existing, 'business_date').slice(0, 7));
    });
  }

  async overview(month: string): Promise<Overview> {
    let result: Overview | undefined;
    await this.database.transaction(async (transaction) => {
      result = await readOverview(transaction, month);
    });
    if (!result) throw new Error('No se pudo consultar el resumen.');
    return result;
  }
}
