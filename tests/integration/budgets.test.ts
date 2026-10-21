import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SqliteAccountRepository } from '../../src/modules/accounts';
import { SqliteBudgetRepository, type Budget } from '../../src/modules/budgets';
import { SqliteCategoryRepository } from '../../src/modules/categories';
import { SqliteFinanceRepository, type Movement } from '../../src/modules/movements';
import { SqliteSyncQueue } from '../../src/modules/sync';
import { SqliteTransferRepository } from '../../src/modules/transfers';
import { createMoney } from '../../src/shared/domain/money';
import {
  migrateDatabase,
  migrations,
  readSchemaVersion,
  schemaVersion,
} from '../../src/shared/storage/migrations';
import { openTestDatabase, type TestDatabase } from '../helpers/node-database';

const createdAt = '2026-10-20T12:00:00.000Z';
const budget: Budget = {
  id: 'food-october',
  categoryId: 'food',
  month: '2026-10',
  limit: createMoney(5000),
  createdAt,
};
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

describe('presupuestos sobre SQLite real', () => {
  let database: TestDatabase;
  let budgets: SqliteBudgetRepository;
  let finance: SqliteFinanceRepository;
  let categories: SqliteCategoryRepository;
  let queue: SqliteSyncQueue;
  beforeEach(async () => {
    database = openTestDatabase();
    await migrateDatabase(database);
    budgets = new SqliteBudgetRepository(database);
    finance = new SqliteFinanceRepository(database);
    categories = new SqliteCategoryRepository(database);
    queue = new SqliteSyncQueue(database);
    for (const id of ['cash', 'bank'])
      await new SqliteAccountRepository(database).save({
        id,
        name: id,
        initialBalance: createMoney(10000),
        createdAt,
      });
  });
  afterEach(() => database.close());

  it('suma gastos de todas las cuentas y excluye ingresos, transferencias, saldo inicial y otros meses', async () => {
    await finance.save(expense);
    await finance.save({
      ...expense,
      id: 'bank-expense',
      accountId: 'bank',
      amount: createMoney(1000),
    });
    await finance.save({ ...expense, id: 'income', kind: 'income', categoryId: 'salary' });
    await finance.save({ ...expense, id: 'other-month', date: '2026-09-30' });
    await new SqliteTransferRepository(database).save({
      id: 'transfer',
      sourceAccountId: 'cash',
      destinationAccountId: 'bank',
      amount: createMoney(500),
      description: 'Transferencia',
      date: expense.date,
      createdAt,
    });
    const before = await finance.overview('2026-10');
    await budgets.save(budget);
    const entries = await budgets.list('2026-10');
    expect(entries[0]?.spent.amountMinor).toBe(4000);
    expect(entries[0]?.remaining.amountMinor).toBe(1000);
    expect(entries[0]?.percentage).toBe(80);
    expect(await finance.overview('2026-10')).toEqual(before);
    expect(await budgets.list('2026-11')).toEqual([]);
  });

  it('recalcula disponible y exceso después de editar o eliminar movimientos', async () => {
    await budgets.save(budget);
    await finance.save(expense);
    expect((await budgets.list(budget.month))[0]?.status).toBe('available');
    await finance.update({ ...expense, amount: createMoney(5000) });
    expect((await budgets.list(budget.month))[0]?.status).toBe('reached');
    await finance.update({ ...expense, amount: createMoney(6000) });
    expect((await budgets.list(budget.month))[0]?.excess.amountMinor).toBe(1000);
    await finance.remove(expense.id);
    expect((await budgets.list(budget.month))[0]?.remaining.amountMinor).toBe(5000);
  });

  it('actualiza ambos presupuestos al cambiar categoría o mes y permite cambiar gasto a ingreso', async () => {
    await budgets.save(budget);
    await budgets.save({ ...budget, id: 'transport-october', categoryId: 'transport' });
    await budgets.save({ ...budget, id: 'food-november', month: '2026-11' });
    await finance.save(expense);
    await finance.update({ ...expense, categoryId: 'transport' });
    expect(
      (await budgets.list('2026-10')).find((entry) => entry.categoryId === 'food')?.spent
        .amountMinor,
    ).toBe(0);
    expect(
      (await budgets.list('2026-10')).find((entry) => entry.categoryId === 'transport')?.spent
        .amountMinor,
    ).toBe(3000);
    await finance.update({ ...expense, date: '2026-11-01' });
    expect((await budgets.list('2026-10')).every((entry) => entry.spent.amountMinor === 0)).toBe(
      true,
    );
    expect((await budgets.list('2026-11'))[0]?.spent.amountMinor).toBe(3000);
    await finance.update({ ...expense, date: '2026-11-01', categoryId: 'salary', kind: 'income' });
    expect((await budgets.list('2026-11'))[0]?.spent.amountMinor).toBe(0);
  });

  it('crea límites independientes por mes sin arrastrar remanentes, incluidos febrero bisiesto y cruce de año', async () => {
    for (const month of ['2024-02', '2024-03', '2025-12', '2026-01'])
      await budgets.save({
        ...budget,
        id: month,
        month,
        limit: createMoney(month === '2024-03' ? 7000 : 5000),
      });
    for (const date of ['2024-02-29', '2024-03-01', '2025-12-31', '2026-01-01'])
      await finance.save({ ...expense, id: date, date });
    expect((await budgets.list('2024-02'))[0]?.remaining.amountMinor).toBe(2000);
    expect((await budgets.list('2024-03'))[0]?.remaining.amountMinor).toBe(4000);
    expect((await budgets.list('2025-12'))[0]?.spent.amountMinor).toBe(3000);
    expect((await budgets.list('2026-01'))[0]?.spent.amountMinor).toBe(3000);
    expect(await budgets.list('2026-02')).toEqual([]);
  });

  it('solo admite una categoría de gasto activa por mes, sin duplicados ni cambios de identidad', async () => {
    await budgets.save(budget);
    await expect(budgets.save({ ...budget, id: 'duplicate' })).rejects.toThrow();
    await expect(budgets.save({ ...budget, id: 'income', categoryId: 'salary' })).rejects.toThrow();
    await expect(
      budgets.save({ ...budget, id: 'missing', categoryId: 'missing' }),
    ).rejects.toThrow();
    await categories.setArchived('transport', true);
    await expect(
      budgets.save({ ...budget, id: 'archived', categoryId: 'transport' }),
    ).rejects.toThrow('archived');
    await expect(async () =>
      database.run('UPDATE budgets SET month = ? WHERE id = ?', ['2026-11', budget.id]),
    ).rejects.toThrow('Only');
    expect(await budgets.list('2026-10')).toHaveLength(1);
  });

  it('conserva gastos y permite editar el límite de una categoría archivada', async () => {
    await budgets.save(budget);
    await finance.save(expense);
    await categories.setArchived('food', true);
    await categories.rename('food', 'Comida');
    await new SqliteAccountRepository(database).setArchived('cash', true);
    await budgets.updateLimit(budget.id, createMoney(2000));
    const entry = (await budgets.list(budget.month))[0];
    expect(entry?.categoryArchived).toBe(true);
    expect(entry?.categoryName).toBe('Comida');
    expect(entry?.spent.amountMinor).toBe(3000);
    expect(entry?.excess.amountMinor).toBe(1000);
    await finance.update({ ...expense, amount: createMoney(1500) });
    expect((await budgets.list(budget.month))[0]?.remaining.amountMinor).toBe(500);
  });

  it('elimina solo el límite, deja un tombstone y permite crear otro con nueva identidad', async () => {
    await budgets.save(budget);
    await finance.save(expense);
    const before = await finance.overview(budget.month);
    await budgets.remove(budget.id);
    expect(await budgets.list(budget.month)).toEqual([]);
    expect(await finance.overview(budget.month)).toEqual(before);
    const deleted = (await queue.listPending()).at(-1);
    expect(deleted?.action).toBe('delete');
    expect(deleted?.snapshot).toEqual({ id: budget.id });
    expect(deleted?.localRevision).toBe(2);
    await budgets.save({ ...budget, id: 'replacement' });
    expect((await budgets.list(budget.month))[0]?.spent.amountMinor).toBe(3000);
  });

  it('revierte creación, edición o eliminación y revisiones si falla el encolado', async () => {
    await budgets.save(budget);
    const before = await queue.listPending();
    const original = await budgets.list(budget.month);
    await database.exec(`CREATE TRIGGER fail_budget_queue BEFORE INSERT ON budget_outbox
      BEGIN SELECT RAISE(ABORT, 'queue unavailable'); END;`);
    await expect(
      budgets.save({ ...budget, id: 'transport', categoryId: 'transport' }),
    ).rejects.toThrow('queue unavailable');
    await expect(budgets.updateLimit(budget.id, createMoney(8000))).rejects.toThrow(
      'queue unavailable',
    );
    await expect(budgets.remove(budget.id)).rejects.toThrow('queue unavailable');
    expect(await budgets.list(budget.month)).toEqual(original);
    expect(await queue.listPending()).toEqual(before);
    expect(
      (
        await database.first('SELECT revision FROM budget_sync_state WHERE budget_id = ?', [
          budget.id,
        ])
      )?.['revision'],
    ).toBe(1);
    expect(
      await database.first("SELECT * FROM budget_sync_state WHERE budget_id = 'transport'"),
    ).toBeNull();
  });

  it('mantiene orden global con categorías y movimientos, y no encola límites sin cambios', async () => {
    const before = await queue.countPending();
    await categories.save({ id: 'pets', name: 'Mascotas', kind: 'expense' });
    await budgets.save({ ...budget, categoryId: 'pets' });
    await finance.save({ ...expense, categoryId: 'pets' });
    await categories.setArchived('pets', true);
    await budgets.updateLimit(budget.id, budget.limit);
    await budgets.updateLimit(budget.id, createMoney(1000));
    const changes = (await queue.listPending()).slice(before);
    expect(changes.map((entry) => entry.entityType)).toEqual([
      'category',
      'budget',
      'movement',
      'category',
      'budget',
    ]);
    expect(changes.at(-1)?.localRevision).toBe(2);
    expect(changes.at(-1)?.snapshot).toEqual({
      id: budget.id,
      category_id: 'pets',
      month: '2026-10',
      limit_minor: 1000,
      currency: 'CLP',
      created_at: createdAt,
    });
    expect(await queue.countPending()).toBe(before + changes.length);
    expect(await queue.listPending(2)).toHaveLength(2);
  });

  it('mantiene precisión en el rango máximo y rechaza límites inválidos o presupuestos ausentes', async () => {
    await budgets.save({ ...budget, limit: createMoney(1) });
    await finance.save({ ...expense, amount: createMoney(Number.MAX_SAFE_INTEGER) });
    expect((await budgets.list(budget.month))[0]?.excess.amountMinor).toBe(
      Number.MAX_SAFE_INTEGER - 1,
    );
    await budgets.updateLimit(budget.id, createMoney(Number.MAX_SAFE_INTEGER));
    expect((await budgets.list(budget.month))[0]?.status).toBe('reached');
    await expect(budgets.updateLimit(budget.id, createMoney(0))).rejects.toThrow();
    await expect(budgets.updateLimit('missing', createMoney(1))).rejects.toThrow('existe');
    await expect(budgets.remove('missing')).rejects.toThrow('existe');
  });
});

it('migra desde esquema 6 conservando datos y cola; presupuestos y revisiones sobreviven al reinicio', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'emberly-budgets-'));
  let database = openTestDatabase(join(directory, 'test.db'));
  try {
    await database.exec('PRAGMA foreign_keys = ON');
    for (const migration of migrations.filter((entry) => entry.version <= 6))
      await database.exec(migration.sql);
    await database.exec('PRAGMA user_version = 6');
    await new SqliteAccountRepository(database).save({
      id: 'cash',
      name: 'Efectivo',
      initialBalance: createMoney(10000),
      createdAt,
    });
    await new SqliteFinanceRepository(database).save(expense);
    const before = await database.all('SELECT * FROM sync_outbox ORDER BY sequence');
    const order = await database.all('SELECT * FROM sync_order ORDER BY sequence');
    await migrateDatabase(database);
    expect(await readSchemaVersion(database)).toBe(schemaVersion);
    expect(await database.all('SELECT * FROM sync_outbox ORDER BY sequence')).toEqual(before);
    expect(await database.all('SELECT * FROM sync_order ORDER BY sequence')).toEqual(order);
    await new SqliteBudgetRepository(database).save(budget);
    await new SqliteBudgetRepository(database).updateLimit(budget.id, createMoney(2000));
    const pending = await new SqliteSyncQueue(database).listPending();
    database.close();
    database = openTestDatabase(join(directory, 'test.db'));
    await migrateDatabase(database);
    expect(await new SqliteSyncQueue(database).listPending()).toEqual(pending);
    expect(
      (await new SqliteBudgetRepository(database).list(budget.month))[0]?.excess.amountMinor,
    ).toBe(1000);
    expect(
      (await new SqliteFinanceRepository(database).overview(budget.month)).balance.amountMinor,
    ).toBe(7000);
  } finally {
    database.close();
    if (
      dirname(resolve(directory)) !== resolve(tmpdir()) ||
      !basename(directory).startsWith('emberly-budgets-')
    )
      throw new Error('Limpieza fuera del directorio temporal de prueba.');
    rmSync(directory, { recursive: true, force: true });
  }
});
