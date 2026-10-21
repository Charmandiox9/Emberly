import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SqliteAccountRepository } from '../../src/modules/accounts';
import { SqliteFinanceRepository, type Movement } from '../../src/modules/movements';
import { SqliteSyncQueue } from '../../src/modules/sync';
import { createMoney } from '../../src/shared/domain/money';
import {
  migrateDatabase,
  migrations,
  readSchemaVersion,
} from '../../src/shared/storage/migrations';
import { openTestDatabase, type TestDatabase } from '../helpers/node-database';

const createdAt = '2026-10-20T12:00:00.000Z';
const account = { id: 'cash', name: 'Efectivo', initialBalance: createMoney(10000), createdAt };
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

async function createVersionTwo(database: TestDatabase): Promise<void> {
  await database.exec('PRAGMA foreign_keys = ON');
  for (const migration of migrations.filter((entry) => entry.version <= 2))
    await database.exec(migration.sql);
  await database.exec('PRAGMA user_version = 2');
}

describe('cola persistente sobre SQLite real', () => {
  let database: TestDatabase;
  let accounts: SqliteAccountRepository;
  let finance: SqliteFinanceRepository;
  let queue: SqliteSyncQueue;

  beforeEach(async () => {
    database = openTestDatabase();
    await migrateDatabase(database);
    accounts = new SqliteAccountRepository(database);
    finance = new SqliteFinanceRepository(database);
    queue = new SqliteSyncQueue(database);
  });
  afterEach(() => database.close());

  it('incluye categorías iniciales como dependencias sin duplicarlas al migrar otra vez', async () => {
    const initial = await queue.listPending();
    expect(initial).toHaveLength(9);
    expect(initial.every((change) => change.entityType === 'category')).toBe(true);
    await migrateDatabase(database);
    expect(await queue.listPending()).toEqual(initial);
  });

  it('guarda snapshots independientes de creación, edición y eliminación', async () => {
    await accounts.save(account);
    await finance.save(expense);
    await finance.update({ ...expense, description: 'Corrección', amount: createMoney(4000) });
    await finance.remove(expense.id);
    const changes = (await queue.listPending()).filter(
      (change) => change.entityType === 'movement',
    );
    expect(changes.map((change) => [change.action, change.localRevision])).toEqual([
      ['upsert', 1],
      ['upsert', 2],
      ['delete', 3],
    ]);
    expect(changes[0]?.snapshot['amount_minor']).toBe(3000);
    expect(changes[1]?.snapshot['amount_minor']).toBe(4000);
    expect(changes[2]?.snapshot).toEqual({ id: 'expense' });
    expect(new Set(changes.map((change) => change.operationId)).size).toBe(3);
    expect(
      await database.first(
        "SELECT local_revision, deleted FROM sync_entities WHERE entity_type = 'movement' AND entity_id = 'expense'",
      ),
    ).toEqual({ local_revision: 3, deleted: 1 });
    expect((await finance.overview('2026-10')).balance.amountMinor).toBe(10000);
  });

  it('conserva operaciones e identificadores al leer de nuevo y limita el lote', async () => {
    await accounts.save(account);
    const first = await queue.listPending(3);
    expect(first).toHaveLength(3);
    expect(await queue.listPending(3)).toEqual(first);
    expect(await queue.countPending()).toBe(10);
    for (const limit of [0, -1, 101, 1.5, NaN])
      await expect(queue.listPending(limit)).rejects.toThrow('lote');
    expect(Object.isFrozen(first[0]?.snapshot)).toBe(true);
  });

  it('no genera una revisión por guardar una edición que no cambia nada', async () => {
    await accounts.save(account);
    await finance.save(expense);
    const previous = await queue.listPending();
    await finance.update(expense);
    expect(await queue.listPending()).toEqual(previous);
  });

  it('revierte el movimiento y la revisión si no puede insertar en la cola', async () => {
    await accounts.save(account);
    const before = await queue.listPending();
    await database.exec(`CREATE TRIGGER block_queue BEFORE INSERT ON sync_outbox
      BEGIN SELECT RAISE(ABORT, 'queue unavailable'); END;`);
    await expect(finance.save(expense)).rejects.toThrow('queue unavailable');
    expect(await finance.get(expense.id)).toBeNull();
    expect(await queue.listPending()).toEqual(before);
    expect(
      await database.first("SELECT * FROM sync_entities WHERE entity_type = 'movement'"),
    ).toBeNull();
  });

  it('revierte la cuenta si no se puede guardar su operación', async () => {
    await database.exec(`CREATE TRIGGER block_queue BEFORE INSERT ON sync_outbox
      BEGIN SELECT RAISE(ABORT, 'queue unavailable'); END;`);
    await expect(accounts.save(account)).rejects.toThrow('queue unavailable');
    expect(await accounts.list()).toEqual([]);
    expect(await queue.countPending()).toBe(9);
  });

  it('una validación financiera fallida revierte también la cola', async () => {
    await accounts.save({ ...account, initialBalance: createMoney(Number.MAX_SAFE_INTEGER) });
    const before = await queue.listPending();
    await expect(
      finance.save({ ...expense, kind: 'income', categoryId: 'salary', amount: createMoney(1) }),
    ).rejects.toThrow('rango seguro');
    expect(await queue.listPending()).toEqual(before);
    expect(await finance.get(expense.id)).toBeNull();
  });

  it('no deja operaciones tras una edición rechazada ni al eliminar un ID inexistente', async () => {
    await accounts.save(account);
    await finance.save(expense);
    const before = await queue.listPending();
    await expect(finance.update({ ...expense, categoryId: 'salary' })).rejects.toThrow();
    await expect(finance.remove('missing')).rejects.toThrow();
    await expect(finance.save(expense)).rejects.toThrow();
    expect(await queue.listPending()).toEqual(before);
    expect((await finance.get(expense.id))?.description).toBe('Almuerzo');
  });

  it('mantiene la secuencia de revisiones al recrear un ID eliminado', async () => {
    await accounts.save(account);
    await finance.save(expense);
    await finance.remove(expense.id);
    await finance.save(expense);
    expect(
      (await queue.listPending())
        .filter((change) => change.entityType === 'movement')
        .map((change) => change.localRevision),
    ).toEqual([1, 2, 3]);
    expect(
      await database.first("SELECT deleted FROM sync_entities WHERE entity_type = 'movement'"),
    ).toEqual({ deleted: 0 });
  });

  it('impide cambiar identificadores y evita perder el seguimiento de una entidad', async () => {
    await accounts.save(account);
    const before = await queue.listPending();
    await expect(async () => {
      await database.run('UPDATE accounts SET id = ? WHERE id = ?', ['new', 'cash']);
    }).rejects.toThrow('immutable');
    expect(await accounts.list()).toEqual([account]);
    expect(await queue.listPending()).toEqual(before);
  });

  it('no desborda una revisión ni modifica el registro cuando llega al límite seguro', async () => {
    await accounts.save(account);
    await database.run('UPDATE sync_entities SET local_revision = ? WHERE entity_type = ?', [
      Number.MAX_SAFE_INTEGER,
      'account',
    ]);
    await expect(async () => {
      await database.run('UPDATE accounts SET name = ? WHERE id = ?', ['Cambio', 'cash']);
    }).rejects.toThrow();
    expect(await accounts.list()).toEqual([account]);
  });

  it('rechaza payloads corruptos al leer sin purgar operaciones', async () => {
    await database.exec('PRAGMA ignore_check_constraints = ON');
    await database.run('UPDATE sync_outbox SET payload_json = ? WHERE sequence = 1', [
      '{"id":"food","bad":[]}',
    ]);
    await expect(queue.listPending()).rejects.toThrow('Contenido pendiente');
    expect(await queue.countPending()).toBe(9);
  });
});

it('migra datos previos sin cambiar saldos ni volver a encolarlos al reabrir', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'emberly-sync-'));
  let database = openTestDatabase(join(directory, 'sync.db'));
  try {
    await createVersionTwo(database);
    await new SqliteAccountRepository(database).save(account);
    await new SqliteFinanceRepository(database).save(expense);
    await migrateDatabase(database);
    const before = await new SqliteSyncQueue(database).listPending();
    expect(before).toHaveLength(11);
    expect(before[0]?.entityType).toBe('account');
    expect(before.at(-1)?.entityType).toBe('movement');
    database.close();
    database = openTestDatabase(join(directory, 'sync.db'));
    await migrateDatabase(database);
    expect(await new SqliteSyncQueue(database).listPending()).toEqual(before);
    expect(
      (await new SqliteFinanceRepository(database).overview('2026-10')).balance.amountMinor,
    ).toBe(7000);
  } finally {
    database.close();
    if (
      dirname(resolve(directory)) !== resolve(tmpdir()) ||
      !basename(directory).startsWith('emberly-sync-')
    )
      throw new Error('Limpieza fuera del directorio temporal de la prueba.');
    rmSync(directory, { recursive: true, force: true });
  }
});

it('revierte por completo una migración de cola interrumpida y permite reintentar', async () => {
  const database = openTestDatabase();
  try {
    await createVersionTwo(database);
    await new SqliteAccountRepository(database).save(account);
    await database.exec('CREATE TABLE sync_outbox (marker TEXT)');
    await expect(migrateDatabase(database)).rejects.toThrow();
    expect(await readSchemaVersion(database)).toBe(2);
    expect(
      await database.first("SELECT name FROM sqlite_master WHERE name = 'sync_entities'"),
    ).toBeNull();
    expect(await new SqliteAccountRepository(database).list()).toEqual([account]);
    await database.exec('DROP TABLE sync_outbox');
    await migrateDatabase(database);
    expect(await new SqliteSyncQueue(database).countPending()).toBe(10);
  } finally {
    database.close();
  }
});
