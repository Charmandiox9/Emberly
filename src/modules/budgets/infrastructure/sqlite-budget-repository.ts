import { createMoney, moneyFromInteger, type Money } from '../../../shared/domain/money';
import type { Database, DatabaseRow } from '../../../shared/storage/database';
import { monthRange } from '../../movements';
import type { BudgetEntry, BudgetRepository } from '../application/budget-repository';
import { budgetLimit, budgetProgress, createBudget, type Budget } from '../domain/budget';

function text(row: DatabaseRow, column: string): string {
  const value = row[column];
  if (typeof value !== 'string') throw new Error('Los datos del presupuesto no son válidos.');
  return value;
}

export class SqliteBudgetRepository implements BudgetRepository {
  constructor(private readonly database: Database) {}

  async list(month: string): Promise<readonly BudgetEntry[]> {
    const range = monthRange(month);
    const rows = await this.database.all(
      `SELECT b.*, c.name AS category_name, c.archived AS category_archived,
        CAST(COALESCE((SELECT SUM(m.amount_minor) FROM movements m
          WHERE m.category_id = b.category_id AND m.kind = 'expense'
          AND m.business_date >= ? AND m.business_date < ?), 0) AS TEXT) AS spent
      FROM budgets b JOIN categories c ON c.id = b.category_id
      WHERE b.month = ? ORDER BY c.archived, c.name, b.id`,
      [range.start, range.end, month],
    );
    return rows.map((row) => {
      const limit = row['limit_minor'];
      const archived = row['category_archived'];
      const spent = text(row, 'spent');
      if (typeof limit !== 'number' || (archived !== 0 && archived !== 1) || !/^\d+$/.test(spent))
        throw new Error('Los importes del presupuesto no son válidos.');
      const currency = row['currency'];
      if (currency !== 'CLP') throw new Error('Moneda de presupuesto no compatible.');
      const budget = createBudget({
        id: text(row, 'id'),
        categoryId: text(row, 'category_id'),
        month: text(row, 'month'),
        limit: createMoney(limit, currency),
        createdAt: text(row, 'created_at'),
      });
      return {
        ...budget,
        ...budgetProgress(budget.limit, moneyFromInteger(BigInt(spent))),
        categoryName: text(row, 'category_name'),
        categoryArchived: archived === 1,
      };
    });
  }

  async save(input: Budget): Promise<void> {
    const budget = createBudget(input);
    await this.database.run(
      `INSERT INTO budgets (id, category_id, month, limit_minor, currency, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        budget.id,
        budget.categoryId,
        budget.month,
        budget.limit.amountMinor,
        budget.limit.currency,
        budget.createdAt,
      ],
    );
  }

  async updateLimit(id: string, input: Money): Promise<void> {
    const limit = budgetLimit(input);
    await this.database.transaction(async (transaction) => {
      if (!(await transaction.first('SELECT id FROM budgets WHERE id = ?', [id])))
        throw new Error('El presupuesto ya no existe.');
      await transaction.run('UPDATE budgets SET limit_minor = ? WHERE id = ?', [
        limit.amountMinor,
        id,
      ]);
    });
  }

  async remove(id: string): Promise<void> {
    await this.database.transaction(async (transaction) => {
      if (!(await transaction.first('SELECT id FROM budgets WHERE id = ?', [id])))
        throw new Error('El presupuesto ya no existe.');
      await transaction.run('DELETE FROM budgets WHERE id = ?', [id]);
    });
  }
}
