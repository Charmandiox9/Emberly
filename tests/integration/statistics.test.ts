import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SqliteAccountRepository } from '../../src/modules/accounts';
import { SqliteCategoryRepository } from '../../src/modules/categories';
import {
  SqliteFinanceRepository,
  type Movement,
  type MovementQuery,
} from '../../src/modules/movements';
import { SqliteStatisticsRepository } from '../../src/modules/statistics';
import { SqliteTransferRepository } from '../../src/modules/transfers';
import { SqliteGoalRepository } from '../../src/modules/goals';
import { SqliteBudgetRepository } from '../../src/modules/budgets';
import { SqliteSyncQueue } from '../../src/modules/sync';
import { businessDateAt } from '../../src/shared/domain/business-date';
import { createMoney, sumMoney, type Money } from '../../src/shared/domain/money';
import { migrateDatabase } from '../../src/shared/storage/migrations';
import { openTestDatabase, type TestDatabase } from '../helpers/node-database';

const createdAt = '2026-10-20T12:00:00.000Z';
const expense: Movement = {
  id: 'expense',
  accountId: 'cash',
  categoryId: 'food',
  kind: 'expense',
  amount: createMoney(3000),
  description: 'Almuerzo',
  date: '2026-10-20',
  createdAt,
};
describe('estadísticas sobre SQLite real', () => {
  let database: TestDatabase;
  let statistics: SqliteStatisticsRepository;
  let finance: SqliteFinanceRepository;
  let accounts: SqliteAccountRepository;
  beforeEach(async () => {
    database = openTestDatabase();
    await migrateDatabase(database);
    statistics = new SqliteStatisticsRepository(database);
    finance = new SqliteFinanceRepository(database);
    accounts = new SqliteAccountRepository(database);
    await accounts.save({
      id: 'cash',
      name: 'Efectivo',
      initialBalance: createMoney(100000),
      createdAt,
    });
  });
  afterEach(() => database.close());

  async function historyTotal(query: MovementQuery): Promise<number> {
    const totals: Money[] = [];
    let page = await finance.list({ ...query, limit: 7 });
    totals.push(...page.entries.map((entry) => entry.amount));
    while (page.nextCursor) {
      page = await finance.list({ ...query, limit: 7, cursor: page.nextCursor });
      totals.push(...page.entries.map((entry) => entry.amount));
    }
    return sumMoney(totals).amountMinor;
  }

  it('reconcilia totales y cada categoría contra todas las páginas del historial filtrado', async () => {
    for (let index = 0; index < 40; index++)
      await finance.save({
        ...expense,
        id: `expense-${index}`,
        categoryId: index % 2 ? 'transport' : 'food',
        amount: createMoney(1000),
      });
    await finance.save({
      ...expense,
      id: 'income',
      kind: 'income',
      categoryId: 'salary',
      amount: createMoney(20000),
    });
    const report = await statistics.read('2026-10');
    expect(report.current.expenses.amountMinor).toBe(
      await historyTotal({ month: '2026-10', kind: 'expense' }),
    );
    expect(report.current.income.amountMinor).toBe(
      await historyTotal({ month: '2026-10', kind: 'income' }),
    );
    expect(report.current.count).toBe(41);
    expect(report.current.net.amountMinor).toBe(-20000);
    for (const category of report.categories)
      expect(category.total.amountMinor).toBe(
        await historyTotal({ month: '2026-10', kind: 'expense', categoryId: category.id }),
      );
    expect(sumMoney(report.categories.map((entry) => entry.total))).toEqual(
      report.current.expenses,
    );
    expect((await finance.overview('2026-10')).expenses).toEqual(report.current.expenses);
  });

  it('excluye saldos iniciales, transferencias, presupuestos y asignaciones a metas', async () => {
    await finance.save(expense);
    const before = await statistics.read('2026-10');
    await accounts.save({
      id: 'bank',
      name: 'Banco',
      initialBalance: createMoney(50000),
      createdAt,
    });
    await new SqliteTransferRepository(database).save({
      id: 'transfer',
      sourceAccountId: 'cash',
      destinationAccountId: 'bank',
      amount: createMoney(10000),
      description: 'Transferencia',
      date: expense.date,
      createdAt,
    });
    const goals = new SqliteGoalRepository(database);
    await goals.save({
      id: 'goal',
      name: 'Emergencia',
      target: createMoney(10000),
      deadline: null,
      createdAt,
    });
    await goals.allocate({
      id: 'allocation',
      goalId: 'goal',
      kind: 'contribute',
      amount: createMoney(5000),
      createdAt,
    });
    await new SqliteBudgetRepository(database).save({
      id: 'budget',
      categoryId: 'food',
      month: '2026-10',
      limit: createMoney(10000),
      createdAt,
    });
    expect(await statistics.read('2026-10')).toEqual(before);
  });

  it('compara meses y actualiza ambos periodos al editar fecha, categoría o tipo y eliminar', async () => {
    await finance.save(expense);
    await finance.save({
      ...expense,
      id: 'previous',
      date: '2026-09-30',
      amount: createMoney(5000),
    });
    expect((await statistics.read('2026-10')).expenseChange?.amount.amountMinor).toBe(2000);
    await finance.update({
      ...expense,
      id: 'previous',
      date: '2026-10-01',
      categoryId: 'transport',
      amount: createMoney(5000),
    });
    let report = await statistics.read('2026-10');
    expect(report.previous?.expenses.amountMinor).toBe(0);
    expect(report.current.expenses.amountMinor).toBe(8000);
    await finance.update({ ...expense, kind: 'income', categoryId: 'salary' });
    report = await statistics.read('2026-10');
    expect(report.current.income.amountMinor).toBe(3000);
    expect(report.categories.map((entry) => entry.id)).toEqual(['transport']);
    await finance.remove('previous');
    expect((await statistics.read('2026-10')).current.expenses.amountMinor).toBe(0);
  });

  it('conserva cuentas y categorías archivadas y muestra nombres actuales sin perder registros', async () => {
    await finance.save(expense);
    await accounts.setArchived('cash', true);
    const categories = new SqliteCategoryRepository(database);
    await categories.setArchived('food', true);
    await categories.rename('food', 'Comida');
    const report = await statistics.read('2026-10');
    expect(report.current.expenses.amountMinor).toBe(3000);
    expect(report.categories[0]?.name).toBe('Comida');
    expect(report.categories[0]?.total.amountMinor).toBe(
      await historyTotal({ month: '2026-10', kind: 'expense', categoryId: 'food' }),
    );
  });

  it('limita la ventana a seis meses y usa fecha de negocio en cruces de año y febrero bisiesto', async () => {
    await finance.save({ ...expense, id: 'outside', date: '2023-08-31' });
    await finance.save({ ...expense, id: 'first', date: '2023-09-01' });
    await finance.save({ ...expense, id: 'year-end', date: '2023-12-31' });
    await finance.save({ ...expense, id: 'new-year', date: '2024-01-01' });
    await finance.save({ ...expense, id: 'leap', date: '2024-02-29' });
    const report = await statistics.read('2024-02');
    expect(report.trend.map((period) => period.month)).toEqual([
      '2023-09',
      '2023-10',
      '2023-11',
      '2023-12',
      '2024-01',
      '2024-02',
    ]);
    expect(report.trend.map((period) => period.count)).toEqual([1, 0, 0, 1, 1, 1]);
    expect(report.current.expenses.amountMinor).toBe(3000);
    expect(report.previous?.expenses.amountMinor).toBe(3000);
  });

  it('asigna por fecha Santiago y no por el mes UTC de auditoría', async () => {
    const audit = '2026-10-01T01:00:00.000Z';
    const date = businessDateAt(new Date(audit), 'America/Santiago').value;
    expect(date).toBe('2026-09-30');
    await finance.save({ ...expense, date, createdAt: audit });
    const report = await statistics.read('2026-10');
    expect(report.current.expenses.amountMinor).toBe(0);
    expect(report.previous?.expenses.amountMinor).toBe(3000);
  });

  it('admite resultados extremos sin calcular diferencias de neto que excedan el rango seguro', async () => {
    await accounts.update('cash', { name: 'Efectivo', initialBalance: createMoney(0) });
    await finance.save({ ...expense, amount: createMoney(Number.MAX_SAFE_INTEGER) });
    await finance.save({
      ...expense,
      id: 'previous-income',
      date: '2026-09-30',
      kind: 'income',
      categoryId: 'salary',
      amount: createMoney(Number.MAX_SAFE_INTEGER),
    });
    const report = await statistics.read('2026-10');
    expect(report.current.net.amountMinor).toBe(-Number.MAX_SAFE_INTEGER);
    expect(report.previous?.net.amountMinor).toBe(Number.MAX_SAFE_INTEGER);
    expect(report.incomeChange?.amount.amountMinor).toBe(Number.MAX_SAFE_INTEGER);
    expect(report.expenseChange?.amount.amountMinor).toBe(Number.MAX_SAFE_INTEGER);
    expect(report.categories[0]?.percentage).toBe(100);
  });

  it('no modifica datos ni cola al leer meses vacíos, repetidos o inválidos', async () => {
    const queue = new SqliteSyncQueue(database);
    const before = await queue.listPending();
    expect((await statistics.read('0001-01')).previous).toBeNull();
    expect((await statistics.read('2026-10')).current.count).toBe(0);
    expect(await statistics.read('2026-10')).toEqual(await statistics.read('2026-10'));
    await expect(statistics.read('2026-99')).rejects.toThrow();
    expect(await queue.listPending()).toEqual(before);
    expect((await finance.overview('2026-10')).balance.amountMinor).toBe(100000);
  });
});
