import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SqliteAccountRepository } from '../../src/modules/accounts';
import { SqliteFinanceRepository } from '../../src/modules/movements';
import { SqliteSyncQueue } from '../../src/modules/sync';
import {
  recordTransfer,
  SqliteTransferRepository,
  type TransferInput,
} from '../../src/modules/transfers';
import { createMoney } from '../../src/shared/domain/money';
import { migrateDatabase, migrations } from '../../src/shared/storage/migrations';
import { openTestDatabase, type TestDatabase } from '../helpers/node-database';

const createdAt = '2026-10-20T12:00:00.000Z';
const reversedAt = '2026-10-20T12:01:00.000Z';
const transfer: TransferInput = {
  id: 'transfer',
  sourceAccountId: 'cash',
  destinationAccountId: 'bank',
  amount: createMoney(3000),
  description: 'A mi banco',
  date: '2026-10-20',
  createdAt,
};

describe('transferencias y gestión de cuentas sobre SQLite real', () => {
  let database: TestDatabase;
  let accounts: SqliteAccountRepository;
  let finance: SqliteFinanceRepository;
  let transfers: SqliteTransferRepository;
  let queue: SqliteSyncQueue;
  beforeEach(async () => {
    database = openTestDatabase();
    await migrateDatabase(database);
    accounts = new SqliteAccountRepository(database);
    finance = new SqliteFinanceRepository(database);
    transfers = new SqliteTransferRepository(database);
    queue = new SqliteSyncQueue(database);
    await accounts.save({
      id: 'cash',
      name: 'Efectivo',
      initialBalance: createMoney(10000),
      createdAt,
    });
    await accounts.save({
      id: 'bank',
      name: 'Banco',
      initialBalance: createMoney(5000),
      createdAt,
    });
  });
  afterEach(() => database.close());
  async function balances(): Promise<readonly number[]> {
    const overview = await finance.overview('2026-10');
    return ['cash', 'bank'].map(
      (id) => overview.accounts.find((account) => account.id === id)?.balance.amountMinor ?? NaN,
    );
  }

  it('aplica ambos lados sin alterar total ni flujo mensual y encola una sola operación', async () => {
    await recordTransfer(transfers, transfer, '2026-10-20');
    expect(await balances()).toEqual([7000, 8000]);
    const overview = await finance.overview('2026-10');
    expect(overview.balance.amountMinor).toBe(15000);
    expect(overview.income.amountMinor).toBe(0);
    expect(overview.expenses.amountMinor).toBe(0);
    expect(overview.expenseCategories).toEqual([]);
    expect((await finance.list({ month: '2026-10' })).entries).toEqual([]);
    const pending = (await queue.listPending()).filter((entry) => entry.entityType === 'transfer');
    expect(pending).toHaveLength(1);
    expect(pending[0]?.snapshot['source_account_id']).toBe('cash');
    expect(pending[0]?.snapshot['destination_account_id']).toBe('bank');
    expect(pending[0]?.snapshot['amount_minor']).toBe(3000);
  });

  it('anula ambos lados, conserva auditoría y no duplica una anulación repetida', async () => {
    await transfers.save(transfer);
    await transfers.reverse(transfer.id, reversedAt);
    await transfers.reverse(transfer.id, '2026-10-20T13:00:00.000Z');
    expect(await balances()).toEqual([10000, 5000]);
    const page = await transfers.list({ month: '2026-10' });
    expect(page.entries[0]?.reversedAt).toBe(reversedAt);
    expect(page.entries[0]?.description).toBe('A mi banco');
    const pending = (await queue.listPending()).filter((entry) => entry.entityType === 'transfer');
    expect(pending.map((entry) => entry.localRevision)).toEqual([1, 2]);
    expect(pending[0]?.snapshot['reversed_at']).toBe('');
    expect(pending[1]?.snapshot['reversed_at']).toBe(reversedAt);
  });

  it('rechaza misma cuenta, referencias inexistentes, ID repetido y fecha futura sin efectos parciales', async () => {
    await expect(transfers.save({ ...transfer, destinationAccountId: 'cash' })).rejects.toThrow();
    await expect(
      transfers.save({ ...transfer, destinationAccountId: 'missing' }),
    ).rejects.toThrow();
    await expect(
      recordTransfer(transfers, { ...transfer, date: '2026-10-21' }, '2026-10-20'),
    ).rejects.toThrow('futuro');
    expect(await balances()).toEqual([10000, 5000]);
    await transfers.save(transfer);
    await expect(transfers.save(transfer)).rejects.toThrow();
    expect(await balances()).toEqual([7000, 8000]);
    expect(await database.all('SELECT * FROM transfer_outbox')).toHaveLength(1);
  });

  it('revierte registro, revisión y saldos si falla el encolado de la transferencia', async () => {
    await database.exec(`CREATE TRIGGER fail_transfer_queue BEFORE INSERT ON transfer_outbox
      BEGIN SELECT RAISE(ABORT, 'queue unavailable'); END;`);
    const before = await queue.countPending();
    await expect(transfers.save(transfer)).rejects.toThrow('queue unavailable');
    expect(await balances()).toEqual([10000, 5000]);
    expect(await database.all('SELECT * FROM transfers')).toEqual([]);
    expect(await database.all('SELECT * FROM transfer_sync_state')).toEqual([]);
    expect(await queue.countPending()).toBe(before);
  });

  it('no confirma una transferencia ni una anulación que desborde una de las cuentas', async () => {
    await accounts.update('cash', {
      name: 'Efectivo',
      initialBalance: createMoney(-Number.MAX_SAFE_INTEGER),
    });
    await expect(transfers.save({ ...transfer, amount: createMoney(1) })).rejects.toThrow(
      'rango seguro',
    );
    expect(await database.all('SELECT * FROM transfer_outbox')).toEqual([]);
    expect((await transfers.list({ month: '2026-10' })).entries).toEqual([]);
    await accounts.save({
      id: 'offset',
      name: 'Compensación',
      initialBalance: createMoney(-5000),
      createdAt,
    });
    await accounts.update('cash', {
      name: 'Efectivo',
      initialBalance: createMoney(Number.MAX_SAFE_INTEGER),
    });
    await accounts.update('bank', { name: 'Banco', initialBalance: createMoney(0) });
    await accounts.update('offset', {
      name: 'Compensación',
      initialBalance: createMoney(-Number.MAX_SAFE_INTEGER),
    });
    await transfers.save({ ...transfer, amount: createMoney(Number.MAX_SAFE_INTEGER) });
    await finance.save({
      id: 'income',
      accountId: 'cash',
      categoryId: 'salary',
      kind: 'income',
      amount: createMoney(Number.MAX_SAFE_INTEGER),
      description: 'Ingreso',
      date: '2026-10-20',
      createdAt,
    });
    await expect(transfers.reverse(transfer.id, reversedAt)).rejects.toThrow('rango seguro');
    expect((await transfers.list({ month: '2026-10' })).entries[0]?.reversedAt).toBeNull();
    expect(await database.all('SELECT * FROM transfer_outbox')).toHaveLength(1);
  });

  it('permite reflejar deuda y conserva saldo e historial al archivar cuentas', async () => {
    await transfers.save({ ...transfer, amount: createMoney(12000) });
    await accounts.setArchived('cash', true);
    expect(await balances()).toEqual([-2000, 17000]);
    expect((await finance.overview('2026-10')).balance.amountMinor).toBe(15000);
    expect((await accounts.listManaged()).find((account) => account.id === 'cash')?.archived).toBe(
      true,
    );
    await expect(transfers.save({ ...transfer, id: 'blocked' })).rejects.toThrow('archived');
    await transfers.reverse(transfer.id, reversedAt);
    expect(await balances()).toEqual([10000, 5000]);
    await accounts.setArchived('cash', false);
    await transfers.save({ ...transfer, id: 'reactivated' });
    expect(await balances()).toEqual([7000, 8000]);
  });

  it('archivar bloquea movimientos nuevos y cambios hacia la cuenta, pero permite corregir su historial', async () => {
    const movement = {
      id: 'expense',
      accountId: 'cash',
      categoryId: 'food',
      kind: 'expense',
      amount: createMoney(1000),
      description: 'Comida',
      date: '2026-10-20',
      createdAt,
    } satisfies Parameters<typeof finance.save>[0];
    await finance.save(movement);
    await accounts.setArchived('cash', true);
    await expect(finance.save({ ...movement, id: 'new' })).rejects.toThrow('archived');
    await finance.update({ ...movement, amount: createMoney(2000) });
    expect((await finance.get('expense'))?.amount.amountMinor).toBe(2000);
    await finance.save({ ...movement, id: 'bank-expense', accountId: 'bank' });
    await expect(finance.update({ ...movement, id: 'bank-expense' })).rejects.toThrow('archived');
    expect((await finance.get('bank-expense'))?.accountId).toBe('bank');
  });

  it('edita nombre y saldo inicial sin crear flujos y encola archivo/reactivación sin duplicados', async () => {
    await transfers.save(transfer);
    await accounts.update('bank', { name: 'Banco nuevo', initialBalance: createMoney(6000) });
    expect(await balances()).toEqual([7000, 9000]);
    expect((await finance.overview('2026-10')).income.amountMinor).toBe(0);
    expect((await transfers.list({ month: '2026-10' })).entries[0]?.destinationName).toBe(
      'Banco nuevo',
    );
    await accounts.setArchived('bank', true);
    const before = await queue.countPending();
    await accounts.setArchived('bank', true);
    expect(await queue.countPending()).toBe(before);
    const last = (await queue.listPending()).at(-1);
    expect(last?.entityId).toBe('bank');
    expect(last?.snapshot['archived']).toBe(1);
    expect((await accounts.list()).find((account) => account.id === 'bank')?.createdAt).toBe(
      createdAt,
    );
  });

  it('una edición inválida o un fallo de cola conserva la cuenta y sus operaciones pendientes', async () => {
    await finance.save({
      id: 'income',
      accountId: 'cash',
      categoryId: 'salary',
      kind: 'income',
      amount: createMoney(1),
      description: 'Extra',
      date: '2026-10-20',
      createdAt,
    });
    const before = await queue.listPending();
    await expect(
      accounts.update('cash', {
        name: 'Cambio',
        initialBalance: createMoney(Number.MAX_SAFE_INTEGER),
      }),
    ).rejects.toThrow('rango seguro');
    await expect(
      accounts.update('cash', { name: ' ', initialBalance: createMoney(0) }),
    ).rejects.toThrow();
    await database.exec(`CREATE TRIGGER fail_account_queue BEFORE INSERT ON sync_outbox
      BEGIN SELECT RAISE(ABORT, 'queue unavailable'); END;`);
    await expect(accounts.setArchived('cash', true)).rejects.toThrow();
    expect((await accounts.listManaged()).find((account) => account.id === 'cash')?.archived).toBe(
      false,
    );
    expect((await accounts.list()).find((account) => account.id === 'cash')?.name).toBe('Efectivo');
    expect(await queue.listPending()).toEqual(before);
    await expect(accounts.setArchived('missing', true)).rejects.toThrow();
  });

  it('ordena globalmente cuenta, transferencia y archivo para no adelantar el archivo al registro', async () => {
    await transfers.save(transfer);
    await accounts.setArchived('cash', true);
    await transfers.reverse(transfer.id, reversedAt);
    const pending = await queue.listPending();
    expect(pending.slice(-3).map((entry) => entry.entityType)).toEqual([
      'transfer',
      'account',
      'transfer',
    ]);
    expect(new Set(pending.map((entry) => entry.sequence)).size).toBe(pending.length);
    expect(await queue.countPending()).toBe(pending.length);
  });

  it('pagina por fecha/ID y filtra por cualquiera de las cuentas, conservando anulaciones', async () => {
    for (const id of ['a', 'b', 'c']) await transfers.save({ ...transfer, id });
    await transfers.reverse('b', reversedAt);
    const first = await transfers.list({ month: '2026-10', accountId: 'bank', limit: 2 });
    expect(first.entries.map((entry) => entry.id)).toEqual(['c', 'b']);
    if (!first.nextCursor) throw new Error('Expected cursor');
    expect(
      (
        await transfers.list({
          month: '2026-10',
          accountId: 'cash',
          limit: 2,
          cursor: first.nextCursor,
        })
      ).entries.map((entry) => entry.id),
    ).toEqual(['a']);
    expect((await transfers.list({ month: '2026-09' })).entries).toEqual([]);
    await expect(transfers.list({ month: '2026-10', limit: 0 })).rejects.toThrow();
    await expect(transfers.reverse('missing', reversedAt)).rejects.toThrow();
    await expect(transfers.reverse('a', '2020-01-01T00:00:00.000Z')).rejects.toThrow();
  });
});

it('migra desde versión 4 conservando operaciones y persiste transferencias y archivo al reabrir', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'emberly-transfers-'));
  let database = openTestDatabase(join(directory, 'test.db'));
  try {
    for (const migration of migrations.filter((entry) => entry.version <= 4))
      await database.exec(migration.sql);
    await database.exec('PRAGMA user_version = 4');
    const accounts = new SqliteAccountRepository(database);
    for (const id of ['cash', 'bank'])
      await accounts.save({ id, name: id, initialBalance: createMoney(10000), createdAt });
    const before = await database.all('SELECT * FROM sync_outbox ORDER BY sequence');
    await migrateDatabase(database);
    expect(await database.all('SELECT * FROM sync_outbox ORDER BY sequence')).toEqual(before);
    await new SqliteTransferRepository(database).save(transfer);
    await accounts.setArchived('cash', true);
    const pending = await new SqliteSyncQueue(database).listPending();
    database.close();
    database = openTestDatabase(join(directory, 'test.db'));
    await migrateDatabase(database);
    expect(await new SqliteSyncQueue(database).listPending()).toEqual(pending);
    expect(
      (await new SqliteTransferRepository(database).list({ month: '2026-10' })).entries,
    ).toHaveLength(1);
    expect(
      (await new SqliteAccountRepository(database).listManaged()).find(
        (account) => account.id === 'cash',
      )?.archived,
    ).toBe(true);
    expect(
      (await new SqliteFinanceRepository(database).overview('2026-10')).balance.amountMinor,
    ).toBe(20000);
  } finally {
    database.close();
    if (
      dirname(resolve(directory)) !== resolve(tmpdir()) ||
      !basename(directory).startsWith('emberly-transfers-')
    )
      throw new Error('Limpieza fuera del directorio temporal de prueba.');
    rmSync(directory, { recursive: true, force: true });
  }
});
