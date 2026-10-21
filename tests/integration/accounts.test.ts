import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openAccount, SqliteAccountRepository } from '../../src/modules/accounts';
import { createMoney } from '../../src/shared/domain/money';
import {
  migrateDatabase,
  readSchemaVersion,
  schemaVersion,
} from '../../src/shared/storage/migrations';
import { openTestDatabase, type TestDatabase } from '../helpers/node-database';

const sample = {
  id: 'account-1',
  name: 'Mi cuenta',
  initialBalance: createMoney(25000),
  createdAt: '2026-10-20T12:00:00.000Z',
};

describe('cuentas y migraciones sobre SQLite real', () => {
  let database: TestDatabase;

  beforeEach(async () => {
    database = openTestDatabase();
    await migrateDatabase(database);
  });

  afterEach(() => database.close());

  it('inicializa una base nueva y conserva cuentas al repetir migraciones', async () => {
    const repository = new SqliteAccountRepository(database);
    await openAccount(repository, sample);
    await migrateDatabase(database);
    expect(await readSchemaVersion(database)).toBe(schemaVersion);
    expect(await repository.list()).toEqual([sample]);
  });

  it('persiste montos negativos y texto con caracteres SQL sin ejecutar su contenido', async () => {
    const repository = new SqliteAccountRepository(database);
    const input = {
      ...sample,
      name: "Banco'); DROP TABLE accounts; --",
      initialBalance: createMoney(-1500),
    };
    await openAccount(repository, input);
    expect(await repository.list()).toEqual([input]);
  });

  it('rechaza cuentas inválidas antes de persistirlas', async () => {
    const repository = new SqliteAccountRepository(database);
    await expect(openAccount(repository, { ...sample, name: ' ' })).rejects.toThrow();
    expect(await repository.list()).toEqual([]);
  });

  it('rechaza un identificador duplicado sin sobrescribir el saldo existente', async () => {
    const repository = new SqliteAccountRepository(database);
    await openAccount(repository, sample);
    await expect(
      openAccount(repository, { ...sample, initialBalance: createMoney(90000) }),
    ).rejects.toThrow();
    expect(await repository.list()).toEqual([sample]);
  });

  it('revierte escrituras relacionadas si una operación falla', async () => {
    await expect(
      database.transaction(async (transaction) => {
        await transaction.run(
          'INSERT INTO accounts (id, name, initial_balance_minor, currency, created_at) VALUES (?, ?, ?, ?, ?)',
          [
            sample.id,
            sample.name,
            sample.initialBalance.amountMinor,
            sample.initialBalance.currency,
            sample.createdAt,
          ],
        );
        throw new Error('Interrupción simulada');
      }),
    ).rejects.toThrow('Interrupción simulada');
    expect(await new SqliteAccountRepository(database).list()).toEqual([]);
  });

  it('no abre ni modifica una base de una versión futura', async () => {
    await database.exec('PRAGMA user_version = 999');
    await expect(migrateDatabase(database)).rejects.toThrow('más reciente');
    expect(await readSchemaVersion(database)).toBe(999);
  });

  it('valida filas persistidas antes de entregarlas al dominio', async () => {
    await database.run(
      'INSERT INTO accounts (id, name, initial_balance_minor, currency, created_at) VALUES (?, ?, ?, ?, ?)',
      [sample.id, sample.name, 1000, 'CLP', 'invalid-date'],
    );
    await expect(new SqliteAccountRepository(database).list()).rejects.toThrow();
  });
});

it('conserva los datos al cerrar y volver a abrir el archivo SQLite', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'emberly-test-'));
  const path = join(directory, 'accounts.db');
  let database = openTestDatabase(path);
  try {
    await migrateDatabase(database);
    await openAccount(new SqliteAccountRepository(database), sample);
    database.close();
    database = openTestDatabase(path);
    await migrateDatabase(database);
    expect(await new SqliteAccountRepository(database).list()).toEqual([sample]);
  } finally {
    database.close();
    if (
      dirname(resolve(directory)) !== resolve(tmpdir()) ||
      !basename(directory).startsWith('emberly-test-')
    ) {
      throw new Error('La limpieza debe limitarse al directorio temporal de esta prueba.');
    }
    rmSync(directory, { recursive: true, force: true });
  }
});

it('revierte una migración fallida y permite reintentar sin pérdida de datos previos', async () => {
  const database = openTestDatabase();
  try {
    await database.exec(
      "CREATE TABLE accounts_created_at (marker TEXT); INSERT INTO accounts_created_at VALUES ('conservar');",
    );
    await expect(migrateDatabase(database)).rejects.toThrow();
    expect(await readSchemaVersion(database)).toBe(0);
    expect(
      await database.first("SELECT name FROM sqlite_master WHERE name = 'accounts'"),
    ).toBeNull();
    expect(await database.first('SELECT marker FROM accounts_created_at')).toEqual({
      marker: 'conservar',
    });
    await database.exec('DROP TABLE accounts_created_at');
    await migrateDatabase(database);
    expect(await readSchemaVersion(database)).toBe(schemaVersion);
  } finally {
    database.close();
  }
});
