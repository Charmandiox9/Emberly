import type { Database, SqlExecutor } from './database';

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
