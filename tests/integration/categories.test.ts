import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SqliteAccountRepository } from '../../src/modules/accounts';
import { SqliteCategoryRepository } from '../../src/modules/categories';
import { SqliteFinanceRepository, type Movement } from '../../src/modules/movements';
import { SqliteSyncQueue } from '../../src/modules/sync';
import { createMoney } from '../../src/shared/domain/money';
import {
  migrateDatabase,
  migrations,
  readSchemaVersion,
  schemaVersion,
} from '../../src/shared/storage/migrations';
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

describe('categorías sobre SQLite real', () => {
  let database: TestDatabase;
  let categories: SqliteCategoryRepository;
  let finance: SqliteFinanceRepository;
  let queue: SqliteSyncQueue;
  beforeEach(async () => {
    database = openTestDatabase();
    await migrateDatabase(database);
    categories = new SqliteCategoryRepository(database);
    finance = new SqliteFinanceRepository(database);
    queue = new SqliteSyncQueue(database);
    await new SqliteAccountRepository(database).save({
      id: 'cash',
      name: 'Efectivo',
      initialBalance: createMoney(10000),
      createdAt,
    });
  });
  afterEach(() => database.close());

  it('crea categorías de ambos tipos y las usa en movimientos del mismo tipo', async () => {
    await categories.save({ id: 'pets', name: '  Mascotas  ', kind: 'expense' });
    await categories.save({ id: 'freelance', name: 'Trabajo independiente', kind: 'income' });
    await finance.save({ ...expense, categoryId: 'pets' });
    await finance.save({
      ...expense,
      id: 'income',
      categoryId: 'freelance',
      kind: 'income',
      amount: createMoney(5000),
    });
    const overview = await finance.overview('2026-10');
    expect(overview.balance.amountMinor).toBe(12000);
    expect(overview.income.amountMinor).toBe(5000);
    expect(overview.expenses.amountMinor).toBe(3000);
    expect((await categories.list()).find((entry) => entry.id === 'pets')).toEqual({
      id: 'pets',
      name: 'Mascotas',
      kind: 'expense',
      archived: false,
    });
    await expect(
      finance.save({ ...expense, id: 'wrong', categoryId: 'freelance' }),
    ).rejects.toThrow();
  });

  it('renombra categorías iniciales sin cambiar importes ni referencias históricas', async () => {
    await finance.save(expense);
    const before = await finance.overview('2026-10');
    await categories.rename('food', 'Comida y compras');
    expect((await finance.get('expense'))?.categoryName).toBe('Comida y compras');
    expect((await finance.get('expense'))?.categoryId).toBe('food');
    const after = await finance.overview('2026-10');
    expect(after.balance).toEqual(before.balance);
    expect(after.expenses).toEqual(before.expenses);
    expect(after.expenseCategories[0]?.name).toBe('Comida y compras');
  });

  it('archiva sin perder historial, filtros o totales, y bloquea registros nuevos', async () => {
    await finance.save(expense);
    await categories.setArchived('food', true);
    await expect(finance.save({ ...expense, id: 'new' })).rejects.toThrow('archived');
    expect((await finance.list({ month: '2026-10', categoryId: 'food' })).entries).toHaveLength(1);
    expect((await finance.categories()).find((entry) => entry.id === 'food')?.name).toBe(
      'Alimentación',
    );
    const overview = await finance.overview('2026-10');
    expect(overview.balance.amountMinor).toBe(7000);
    expect(overview.expenses.amountMinor).toBe(3000);
    expect(overview.expenseCategories[0]?.id).toBe('food');
    await categories.setArchived('food', false);
    await finance.save({ ...expense, id: 'new' });
    expect((await finance.overview('2026-10')).expenses.amountMinor).toBe(6000);
  });

  it('permite corregir o eliminar un movimiento en su categoría archivada, pero no mover otro hacia ella', async () => {
    await finance.save(expense);
    await finance.save({ ...expense, id: 'other', categoryId: 'transport' });
    await categories.setArchived('food', true);
    await finance.update({ ...expense, amount: createMoney(2000), description: 'Corrección' });
    expect((await finance.get('expense'))?.amount.amountMinor).toBe(2000);
    await expect(finance.update({ ...expense, id: 'other' })).rejects.toThrow('archived');
    await finance.update({ ...expense, categoryId: 'transport' });
    await expect(finance.update(expense)).rejects.toThrow('archived');
    await finance.remove('expense');
    expect(await finance.get('expense')).toBeNull();
  });

  it('protege el tipo y las referencias también ante escrituras SQL directas', async () => {
    await finance.save(expense);
    await expect(async () =>
      database.run('UPDATE categories SET kind = ? WHERE id = ?', ['income', 'food']),
    ).rejects.toThrow('immutable');
    await expect(async () =>
      database.run('DELETE FROM categories WHERE id = ?', ['food']),
    ).rejects.toThrow();
    await categories.setArchived('food', true);
    await expect(async () =>
      database.run(
        `INSERT INTO movements (id, account_id, category_id, kind, amount_minor, description, business_date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['direct', 'cash', 'food', 'expense', 1, 'Directo', expense.date, createdAt],
      ),
    ).rejects.toThrow('archived');
  });

  it('emite snapshots y revisiones en orden, sin duplicar actualizaciones que no cambian valores', async () => {
    const before = await queue.countPending();
    await categories.save({ id: 'pets', name: 'Mascotas', kind: 'expense' });
    await finance.save({ ...expense, categoryId: 'pets' });
    await categories.rename('pets', 'Cuidados');
    await categories.setArchived('pets', true);
    await categories.setArchived('pets', true);
    await categories.rename('pets', ' Cuidados ');
    const pending = (await queue.listPending()).slice(before);
    expect(pending.map((entry) => entry.entityType)).toEqual([
      'category',
      'movement',
      'category',
      'category',
    ]);
    const changes = await database.all(
      "SELECT local_revision, payload_json FROM sync_outbox WHERE entity_type = 'category' AND entity_id = 'pets' ORDER BY sequence",
    );
    expect(changes.map((entry) => entry['local_revision'])).toEqual([1, 2, 3]);
    expect(changes[0]?.['payload_json']).toBe(
      JSON.stringify({ id: 'pets', name: 'Mascotas', kind: 'expense', archived: 0 }),
    );
    expect(changes[2]?.['payload_json']).toBe(
      JSON.stringify({ id: 'pets', name: 'Cuidados', kind: 'expense', archived: 1 }),
    );
  });

  it('revierte creación, nombre y archivo junto con sus eventos si falla la cola', async () => {
    const before = await queue.listPending();
    const original = await categories.list();
    await database.exec(`CREATE TRIGGER fail_category_queue BEFORE INSERT ON sync_outbox WHEN NEW.entity_type = 'category'
      BEGIN SELECT RAISE(ABORT, 'queue unavailable'); END;`);
    await expect(
      categories.save({ id: 'pets', name: 'Mascotas', kind: 'expense' }),
    ).rejects.toThrow('queue unavailable');
    await expect(categories.rename('food', 'Comida')).rejects.toThrow('queue unavailable');
    await expect(categories.setArchived('food', true)).rejects.toThrow('queue unavailable');
    expect(await categories.list()).toEqual(original);
    expect(await queue.listPending()).toEqual(before);
    expect(
      await database.first(
        "SELECT * FROM sync_entities WHERE entity_type = 'category' AND entity_id = 'pets'",
      ),
    ).toBeNull();
    expect(
      (
        await database.first(
          "SELECT local_revision FROM sync_entities WHERE entity_type = 'category' AND entity_id = 'food'",
        )
      )?.['local_revision'],
    ).toBe(1);
  });

  it('rechaza nombres inválidos, IDs duplicados y cambios a categorías inexistentes', async () => {
    const before = await queue.listPending();
    await expect(
      categories.save({ id: 'food', name: 'Duplicada', kind: 'expense' }),
    ).rejects.toThrow();
    await expect(categories.rename('food', ' ')).rejects.toThrow();
    await expect(
      categories.save({ id: 'invalid', name: 'a'.repeat(61), kind: 'income' }),
    ).rejects.toThrow();
    await expect(categories.rename('missing', 'Nombre')).rejects.toThrow('existe');
    await expect(categories.setArchived('missing', true)).rejects.toThrow('existe');
    expect(await queue.listPending()).toEqual(before);
  });
});

it('migra desde esquema 5 conservando eventos y datos, y persiste categorías al reabrir', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'emberly-categories-'));
  let database = openTestDatabase(join(directory, 'test.db'));
  try {
    await database.exec('PRAGMA foreign_keys = ON');
    for (const migration of migrations.filter((entry) => entry.version <= 5))
      await database.exec(migration.sql);
    await database.exec('PRAGMA user_version = 5');
    await new SqliteAccountRepository(database).save({
      id: 'cash',
      name: 'Efectivo',
      initialBalance: createMoney(10000),
      createdAt,
    });
    await new SqliteFinanceRepository(database).save(expense);
    const oldQueue = await database.all('SELECT * FROM sync_outbox ORDER BY sequence');
    const oldOrder = await database.all('SELECT * FROM sync_order ORDER BY sequence');
    await migrateDatabase(database);
    expect(await readSchemaVersion(database)).toBe(schemaVersion);
    expect(await database.all('SELECT * FROM sync_outbox ORDER BY sequence')).toEqual(oldQueue);
    expect(await database.all('SELECT * FROM sync_order ORDER BY sequence')).toEqual(oldOrder);
    expect(
      (await new SqliteCategoryRepository(database).list()).every((entry) => !entry.archived),
    ).toBe(true);
    await new SqliteCategoryRepository(database).setArchived('food', true);
    await new SqliteCategoryRepository(database).save({
      id: 'pets',
      name: 'Mascotas',
      kind: 'expense',
    });
    await new SqliteCategoryRepository(database).rename('pets', 'Veterinaria');
    const pending = await new SqliteSyncQueue(database).listPending();
    database.close();
    database = openTestDatabase(join(directory, 'test.db'));
    await migrateDatabase(database);
    expect(await new SqliteSyncQueue(database).listPending()).toEqual(pending);
    expect(
      (await new SqliteCategoryRepository(database).list()).find((entry) => entry.id === 'food')
        ?.archived,
    ).toBe(true);
    expect(
      (await new SqliteCategoryRepository(database).list()).find((entry) => entry.id === 'pets'),
    ).toEqual({ id: 'pets', name: 'Veterinaria', kind: 'expense', archived: false });
    expect(
      (await new SqliteFinanceRepository(database).overview('2026-10')).balance.amountMinor,
    ).toBe(7000);
    expect((await new SqliteFinanceRepository(database).get('expense'))?.categoryName).toBe(
      'Alimentación',
    );
  } finally {
    database.close();
    if (
      dirname(resolve(directory)) !== resolve(tmpdir()) ||
      !basename(directory).startsWith('emberly-categories-')
    )
      throw new Error('Limpieza fuera del directorio temporal de prueba.');
    rmSync(directory, { recursive: true, force: true });
  }
});
