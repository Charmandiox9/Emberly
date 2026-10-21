import type { Database, SqlExecutor } from './database';
import { outboxMigrationSql } from './migrations/0003-outbox';
import { attachmentsMigrationSql } from './migrations/0004-attachments';
import { transfersMigrationSql } from './migrations/0005-transfers';
import { categoriesMigrationSql } from './migrations/0006-categories';
import { budgetsMigrationSql } from './migrations/0007-budgets';
import { goalsMigrationSql } from './migrations/0008-goals';
import { remindersMigrationSql } from './migrations/0009-reminders';

export interface Migration {
  readonly version: number;
  readonly sql: string;
}

export const migrations: readonly Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE accounts (
        id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) BETWEEN 1 AND 128),
        name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
        initial_balance_minor INTEGER NOT NULL
          CHECK (typeof(initial_balance_minor) = 'integer'
            AND initial_balance_minor BETWEEN -9007199254740991 AND 9007199254740991),
        currency TEXT NOT NULL CHECK (currency = 'CLP'),
        created_at TEXT NOT NULL
      );
      CREATE INDEX accounts_created_at ON accounts(created_at, id);
    `,
  },
  {
    version: 2,
    sql: `
      CREATE TABLE categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
        kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
        UNIQUE (id, kind)
      );
      INSERT INTO categories (id, name, kind) VALUES
        ('salary', 'Sueldo', 'income'), ('extra', 'Ingreso extra', 'income'),
        ('other-income', 'Otros ingresos', 'income'),
        ('food', 'Alimentación', 'expense'), ('transport', 'Transporte', 'expense'),
        ('home', 'Hogar', 'expense'), ('health', 'Salud', 'expense'),
        ('leisure', 'Ocio', 'expense'), ('other-expense', 'Otros gastos', 'expense');
      CREATE TABLE movements (
        id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) BETWEEN 1 AND 128),
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        category_id TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
        amount_minor INTEGER NOT NULL CHECK (typeof(amount_minor) = 'integer'
          AND amount_minor BETWEEN 1 AND 9007199254740991),
        description TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 120),
        business_date TEXT NOT NULL CHECK (length(business_date) = 10),
        created_at TEXT NOT NULL,
        FOREIGN KEY (category_id, kind) REFERENCES categories(id, kind) ON DELETE RESTRICT
      );
      CREATE INDEX movements_date_id ON movements(business_date DESC, id DESC);
      CREATE INDEX movements_account_date ON movements(account_id, business_date);
    `,
  },
  { version: 3, sql: outboxMigrationSql },
  { version: 4, sql: attachmentsMigrationSql },
  { version: 5, sql: transfersMigrationSql },
  { version: 6, sql: categoriesMigrationSql },
  { version: 7, sql: budgetsMigrationSql },
  { version: 8, sql: goalsMigrationSql },
  { version: 9, sql: remindersMigrationSql },
];

export const schemaVersion = migrations.at(-1)?.version ?? 0;

export async function readSchemaVersion(database: SqlExecutor): Promise<number> {
  const row = await database.first('PRAGMA user_version');
  const version = row?.['user_version'];
  if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 0) {
    throw new Error('No se pudo leer la versión de los datos.');
  }
  return version;
}

export async function migrateDatabase(database: Database): Promise<void> {
  await database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  await database.transaction(async (transaction) => {
    const currentVersion = await readSchemaVersion(transaction);
    if (currentVersion > schemaVersion) {
      throw new Error('Los datos pertenecen a una versión más reciente de Emberly.');
    }
    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        await transaction.exec(migration.sql);
        await transaction.exec(`PRAGMA user_version = ${migration.version}`);
      }
    }
  });
}
