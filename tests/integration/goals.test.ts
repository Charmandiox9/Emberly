import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SqliteAccountRepository } from '../../src/modules/accounts';
import { SqliteGoalRepository, type Goal, type GoalAllocation } from '../../src/modules/goals';
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
const goal: Goal = {
  id: 'emergency',
  name: 'Emergencia',
  target: createMoney(10000),
  deadline: null,
  createdAt,
};
const allocation: GoalAllocation = {
  id: 'allocation',
  goalId: goal.id,
  kind: 'contribute',
  amount: createMoney(6000),
  createdAt,
};
const expense: Movement = {
  id: 'expense',
  accountId: 'cash',
  categoryId: 'food',
  kind: 'expense',
  amount: createMoney(8000),
  description: 'Gasto',
  date: '2026-10-20',
  createdAt,
};

describe('metas sobre SQLite real', () => {
  let database: TestDatabase;
  let goals: SqliteGoalRepository;
  let accounts: SqliteAccountRepository;
  let finance: SqliteFinanceRepository;
  let queue: SqliteSyncQueue;
  beforeEach(async () => {
    database = openTestDatabase();
    await migrateDatabase(database);
    goals = new SqliteGoalRepository(database);
    accounts = new SqliteAccountRepository(database);
    finance = new SqliteFinanceRepository(database);
    queue = new SqliteSyncQueue(database);
    await accounts.save({
      id: 'cash',
      name: 'Efectivo',
      initialBalance: createMoney(10000),
      createdAt,
    });
    await goals.save(goal);
  });
  afterEach(() => database.close());

  it.each([29, 57])('conserva el porcentaje entero exacto de %i sobre cien', async (assigned) => {
    await goals.update(goal.id, { name: goal.name, target: createMoney(100), deadline: null });
    await goals.allocate({ ...allocation, amount: createMoney(assigned) });
    expect((await goals.overview()).goals[0]?.percentage).toBe(assigned);
  });

  it('aporta y retira sin crear ingresos/gastos ni modificar saldos o presupuestos', async () => {
    const before = await finance.overview('2026-10');
    await goals.allocate(allocation);
    let overview = await goals.overview();
    expect(overview.funding.assigned.amountMinor).toBe(6000);
    expect(overview.funding.available.amountMinor).toBe(4000);
    expect(overview.goals[0]?.remaining.amountMinor).toBe(4000);
    await goals.allocate({
      ...allocation,
      id: 'withdraw',
      kind: 'withdraw',
      amount: createMoney(2000),
    });
    overview = await goals.overview();
    expect(overview.funding.assigned.amountMinor).toBe(4000);
    expect(overview.funding.available.amountMinor).toBe(6000);
    expect(await finance.overview('2026-10')).toEqual(before);
    expect((await finance.list({ month: '2026-10' })).entries).toEqual([]);
  });

  it('impide asignar el mismo saldo a dos metas y exceder objetivo o asignación', async () => {
    await goals.save({ ...goal, id: 'travel', name: 'Viaje' });
    await goals.allocate(allocation);
    const before = await queue.listPending();
    await expect(goals.allocate({ ...allocation, id: 'other', goalId: 'travel' })).rejects.toThrow(
      'disponible',
    );
    await expect(
      goals.allocate({ ...allocation, id: 'too-much', amount: createMoney(5000) }),
    ).rejects.toThrow();
    await expect(
      goals.allocate({
        ...allocation,
        id: 'withdraw',
        kind: 'withdraw',
        amount: createMoney(6001),
      }),
    ).rejects.toThrow('supera');
    expect(await queue.listPending()).toEqual(before);
    expect((await goals.overview()).funding.assigned.amountMinor).toBe(6000);
  });

  it('reconoce reintentos exactos incluso tras completar, gastar o retirar, y rechaza reutilizar el ID para otra intención', async () => {
    await goals.allocate({ ...allocation, amount: createMoney(10000) });
    const pending = await queue.listPending();
    await goals.allocate({ ...allocation, amount: createMoney(10000) });
    expect(await queue.listPending()).toEqual(pending);
    await finance.save(expense);
    await goals.allocate({ ...allocation, amount: createMoney(10000) });
    await goals.allocate({
      ...allocation,
      id: 'withdraw',
      kind: 'withdraw',
      amount: createMoney(1000),
    });
    const after = await queue.listPending();
    await goals.allocate({
      ...allocation,
      id: 'withdraw',
      kind: 'withdraw',
      amount: createMoney(1000),
    });
    await expect(goals.allocate({ ...allocation, amount: createMoney(9000) })).rejects.toThrow(
      'identificador',
    );
    expect(await queue.listPending()).toEqual(after);
    expect((await goals.overview()).funding.assigned.amountMinor).toBe(9000);
  });

  it('muestra faltante tras gastos y permite liberar asignaciones sin rechazar la realidad financiera', async () => {
    await goals.allocate(allocation);
    await finance.save(expense);
    let funding = (await goals.overview()).funding;
    expect(funding.balance.amountMinor).toBe(2000);
    expect(funding.assigned.amountMinor).toBe(6000);
    expect(funding.available.amountMinor).toBe(0);
    expect(funding.shortfall.amountMinor).toBe(4000);
    await expect(
      goals.allocate({ ...allocation, id: 'more', amount: createMoney(1) }),
    ).rejects.toThrow();
    await goals.allocate({
      ...allocation,
      id: 'withdraw',
      kind: 'withdraw',
      amount: createMoney(4000),
    });
    funding = (await goals.overview()).funding;
    expect(funding.shortfall.amountMinor).toBe(0);
    expect(funding.assigned.amountMinor).toBe(2000);
    expect(funding.balance.amountMinor).toBe(2000);
  });

  it('actualiza respaldo ante edición/eliminación de movimientos y corrección de saldo inicial', async () => {
    await goals.allocate(allocation);
    await finance.save(expense);
    await finance.update({ ...expense, amount: createMoney(5000) });
    expect((await goals.overview()).funding.shortfall.amountMinor).toBe(1000);
    await finance.remove(expense.id);
    expect((await goals.overview()).funding.available.amountMinor).toBe(4000);
    await accounts.update('cash', { name: 'Efectivo', initialBalance: createMoney(3000) });
    expect((await goals.overview()).funding.shortfall.amountMinor).toBe(3000);
  });

  it('incluye cuentas archivadas y transferencias sin duplicar dinero disponible', async () => {
    await goals.allocate(allocation);
    await accounts.save({ id: 'bank', name: 'Banco', initialBalance: createMoney(0), createdAt });
    await new SqliteTransferRepository(database).save({
      id: 'transfer',
      sourceAccountId: 'cash',
      destinationAccountId: 'bank',
      amount: createMoney(5000),
      description: 'Entre cuentas',
      date: expense.date,
      createdAt,
    });
    await accounts.setArchived('cash', true);
    expect((await goals.overview()).funding.available.amountMinor).toBe(4000);
    expect((await goals.overview()).funding.balance.amountMinor).toBe(10000);
  });

  it('conserva aportes al reducir el objetivo, muestra exceso y cambia completado al retirar', async () => {
    await goals.allocate(allocation);
    await goals.update(goal.id, {
      name: 'Fondo',
      target: createMoney(5000),
      deadline: '2024-02-29',
    });
    let entry = (await goals.overview()).goals[0];
    expect(entry?.assigned.amountMinor).toBe(6000);
    expect(entry?.excess.amountMinor).toBe(1000);
    expect(entry?.complete).toBe(true);
    expect(entry?.percentage).toBe(100);
    expect(entry?.deadline).toBe('2024-02-29');
    await expect(
      goals.allocate({ ...allocation, id: 'more', amount: createMoney(1) }),
    ).rejects.toThrow();
    await goals.allocate({
      ...allocation,
      id: 'withdraw',
      kind: 'withdraw',
      amount: createMoney(2000),
    });
    entry = (await goals.overview()).goals[0];
    expect(entry?.complete).toBe(false);
    expect(entry?.remaining.amountMinor).toBe(1000);
    expect((await goals.history({ goalId: goal.id })).entries).toHaveLength(2);
  });

  it('revierte meta, asignación, saldo derivado y revisiones si falla su cola', async () => {
    const before = await queue.listPending();
    await database.exec(
      `CREATE TRIGGER fail_goal_queue BEFORE INSERT ON goal_outbox BEGIN SELECT RAISE(ABORT, 'queue unavailable'); END;`,
    );
    await expect(goals.save({ ...goal, id: 'new' })).rejects.toThrow('queue unavailable');
    await expect(goals.update(goal.id, { ...goal, name: 'Cambio' })).rejects.toThrow(
      'queue unavailable',
    );
    await expect(goals.allocate(allocation)).rejects.toThrow('queue unavailable');
    expect(await queue.listPending()).toEqual(before);
    const overview = await goals.overview();
    expect(overview.goals).toHaveLength(1);
    expect(overview.goals[0]?.name).toBe('Emergencia');
    expect(overview.funding.assigned.amountMinor).toBe(0);
    expect((await goals.history({ goalId: goal.id })).entries).toEqual([]);
    expect(
      await database.first("SELECT * FROM goal_sync_state WHERE entity_type = 'goal_allocation'"),
    ).toBeNull();
  });

  it('revierte también un evento ya encolado si falla la actualización del saldo derivado', async () => {
    const before = await queue.listPending();
    await database.exec(`CREATE TRIGGER fail_assigned_balance AFTER UPDATE OF assigned_minor ON goals
      WHEN OLD.assigned_minor IS NOT NEW.assigned_minor
      BEGIN SELECT RAISE(ABORT, 'derived balance unavailable'); END;`);
    await expect(goals.allocate(allocation)).rejects.toThrow('derived balance unavailable');
    expect((await goals.overview()).funding.assigned.amountMinor).toBe(0);
    expect((await goals.history({ goalId: goal.id })).entries).toEqual([]);
    expect(await queue.listPending()).toEqual(before);
    expect(
      await database.first("SELECT * FROM goal_sync_state WHERE entity_type = 'goal_allocation'"),
    ).toBeNull();
  });

  it('conserva auditoría e identidad ante SQL directo y no permite retirar por encima del saldo de la meta', async () => {
    await goals.allocate(allocation);
    await expect(async () =>
      database.run('UPDATE goal_allocations SET amount_minor = ? WHERE id = ?', [
        1000,
        allocation.id,
      ]),
    ).rejects.toThrow('opposite');
    await expect(async () =>
      database.run('DELETE FROM goal_allocations WHERE id = ?', [allocation.id]),
    ).rejects.toThrow('history');
    await expect(async () =>
      database.run('DELETE FROM goals WHERE id = ?', [goal.id]),
    ).rejects.toThrow('history');
    await expect(async () =>
      database.run('UPDATE goals SET id = ? WHERE id = ?', ['new', goal.id]),
    ).rejects.toThrow('immutable');
    await expect(async () =>
      database.run(
        'INSERT INTO goal_allocations (id, goal_id, kind, amount_minor, created_at) VALUES (?, ?, ?, ?, ?)',
        ['invalid', goal.id, 'withdraw', 7000, createdAt],
      ),
    ).rejects.toThrow('limits');
    expect((await goals.overview()).funding.assigned.amountMinor).toBe(6000);
  });

  it('mantiene orden global de metas, aportes y movimientos, sin eventos por actualizaciones idénticas', async () => {
    const before = await queue.countPending();
    await goals.update(goal.id, goal);
    expect(await queue.countPending()).toBe(before);
    await goals.allocate(allocation);
    await finance.save(expense);
    await goals.update(goal.id, { ...goal, name: 'Fondo' });
    const changes = (await queue.listPending()).slice(before);
    expect(changes.map((change) => change.entityType)).toEqual([
      'goal_allocation',
      'movement',
      'goal',
    ]);
    expect(changes[0]?.snapshot).toEqual({
      id: allocation.id,
      goal_id: goal.id,
      kind: 'contribute',
      amount_minor: 6000,
      created_at: createdAt,
    });
    expect(changes[2]?.snapshot).toEqual({
      id: goal.id,
      name: 'Fondo',
      target_minor: 10000,
      deadline: '',
      created_at: createdAt,
    });
    expect(changes[2]?.localRevision).toBe(2);
    expect(await queue.countPending()).toBe(before + 3);
  });

  it('pagina historial por auditoría/ID sin duplicados, con filtro de meta y límites válidos', async () => {
    for (let index = 0; index < 35; index++)
      await goals.allocate({
        ...allocation,
        id: `a${String(index).padStart(2, '0')}`,
        kind: index % 2 === 0 ? 'contribute' : 'withdraw',
        amount: createMoney(1),
      });
    const first = await goals.history({ goalId: goal.id });
    expect(first.entries).toHaveLength(30);
    expect(first.entries[0]?.id).toBe('a34');
    if (!first.nextCursor) throw new Error('Expected cursor');
    const second = await goals.history({ goalId: goal.id, cursor: first.nextCursor });
    expect(second.entries.map((entry) => entry.id)).toEqual(['a04', 'a03', 'a02', 'a01', 'a00']);
    expect(second.nextCursor).toBeNull();
    expect((await goals.history({ goalId: 'other' })).entries).toEqual([]);
    await expect(goals.history({ goalId: goal.id, limit: 101 })).rejects.toThrow();
  });

  it('maneja saldo negativo extremo sin desbordar el faltante de respaldo', async () => {
    await accounts.update('cash', {
      name: 'Efectivo',
      initialBalance: createMoney(Number.MAX_SAFE_INTEGER),
    });
    await goals.update(goal.id, { ...goal, target: createMoney(Number.MAX_SAFE_INTEGER) });
    await goals.allocate({ ...allocation, amount: createMoney(Number.MAX_SAFE_INTEGER) });
    await accounts.update('cash', {
      name: 'Deuda',
      initialBalance: createMoney(Number.MIN_SAFE_INTEGER),
    });
    let funding = (await goals.overview()).funding;
    expect(funding.available.amountMinor).toBe(0);
    expect(funding.shortfall.amountMinor).toBe(Number.MAX_SAFE_INTEGER);
    expect(funding.balance.amountMinor).toBe(Number.MIN_SAFE_INTEGER);
    await goals.allocate({
      ...allocation,
      id: 'withdraw',
      kind: 'withdraw',
      amount: createMoney(Number.MAX_SAFE_INTEGER),
    });
    funding = (await goals.overview()).funding;
    expect(funding.shortfall.amountMinor).toBe(0);
    expect(funding.balance.amountMinor).toBe(Number.MIN_SAFE_INTEGER);
  });

  it('rechaza metas inexistentes, duplicadas y auditoría anterior sin encolar cambios', async () => {
    const before = await queue.listPending();
    await expect(goals.save(goal)).rejects.toThrow();
    await expect(goals.update('missing', goal)).rejects.toThrow('existe');
    await expect(goals.allocate({ ...allocation, goalId: 'missing' })).rejects.toThrow('existe');
    await expect(
      goals.allocate({ ...allocation, createdAt: '2026-10-19T12:00:00.000Z' }),
    ).rejects.toThrow('anterior');
    expect(await queue.listPending()).toEqual(before);
  });
});

it('migra desde esquema 7 y conserva metas, asignaciones, historial y cola al reabrir', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'emberly-goals-'));
  let database = openTestDatabase(join(directory, 'test.db'));
  try {
    await database.exec('PRAGMA foreign_keys = ON');
    for (const migration of migrations.filter((entry) => entry.version <= 7))
      await database.exec(migration.sql);
    await database.exec('PRAGMA user_version = 7');
    await new SqliteAccountRepository(database).save({
      id: 'cash',
      name: 'Efectivo',
      initialBalance: createMoney(10000),
      createdAt,
    });
    const before = await database.all('SELECT * FROM sync_outbox ORDER BY sequence');
    const order = await database.all('SELECT * FROM sync_order ORDER BY sequence');
    await migrateDatabase(database);
    expect(await readSchemaVersion(database)).toBe(schemaVersion);
    expect(await database.all('SELECT * FROM sync_outbox ORDER BY sequence')).toEqual(before);
    expect(await database.all('SELECT * FROM sync_order ORDER BY sequence')).toEqual(order);
    await new SqliteGoalRepository(database).save(goal);
    await new SqliteGoalRepository(database).allocate(allocation);
    const pending = await new SqliteSyncQueue(database).listPending();
    database.close();
    database = openTestDatabase(join(directory, 'test.db'));
    await migrateDatabase(database);
    await new SqliteGoalRepository(database).allocate(allocation);
    expect(await new SqliteSyncQueue(database).listPending()).toEqual(pending);
    expect((await new SqliteGoalRepository(database).overview()).funding.assigned.amountMinor).toBe(
      6000,
    );
    expect((await new SqliteGoalRepository(database).history({ goalId: goal.id })).entries).toEqual(
      [allocation],
    );
  } finally {
    database.close();
    if (
      dirname(resolve(directory)) !== resolve(tmpdir()) ||
      !basename(directory).startsWith('emberly-goals-')
    )
      throw new Error('Limpieza fuera del directorio temporal de prueba.');
    rmSync(directory, { recursive: true, force: true });
  }
});
