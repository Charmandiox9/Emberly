import { moneyFromInteger } from '../../../shared/domain/money';
import type { DatabaseRow, SqlExecutor } from '../../../shared/storage/database';
import { monthRange } from '../../movements';
import type { StatisticsRepository } from '../application/statistics-repository';
import {
  buildStatistics,
  statisticsMonths,
  type MonthlyCategoryTotal,
  type StatisticsReport,
} from '../domain/statistics';

function text(row: DatabaseRow, field: string): string {
  const value = row[field];
  if (typeof value !== 'string') throw new Error('Resumen guardado inválido.');
  return value;
}
export class SqliteStatisticsRepository implements StatisticsRepository {
  constructor(private readonly database: SqlExecutor) {}

  async read(month: string): Promise<StatisticsReport> {
    const months = statisticsMonths(month);
    const first = months[0];
    if (!first) throw new Error('Periodo inválido.');
    const rows = await this.database.all(
      `SELECT substr(m.business_date, 1, 7) AS month, m.kind, c.id, c.name,
        CAST(SUM(m.amount_minor) AS TEXT) AS total, COUNT(*) AS count
      FROM movements m JOIN categories c ON c.id = m.category_id
      WHERE m.business_date >= ? AND m.business_date < ?
      GROUP BY substr(m.business_date, 1, 7), m.kind, c.id`,
      [monthRange(first).start, monthRange(month).end],
    );
    const totals = rows.map((row): MonthlyCategoryTotal => {
      const kind = row['kind'];
      const count = row['count'];
      const total = text(row, 'total');
      if (
        (kind !== 'income' && kind !== 'expense') ||
        typeof count !== 'number' ||
        !/^\d+$/.test(total)
      )
        throw new Error('Resumen guardado inválido.');
      return {
        month: text(row, 'month'),
        kind,
        categoryId: text(row, 'id'),
        categoryName: text(row, 'name'),
        total: moneyFromInteger(BigInt(total)),
        count,
      };
    });
    return buildStatistics(month, totals);
  }
}
