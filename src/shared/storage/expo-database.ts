import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { Database, DatabaseRow, SqlExecutor, SqlValue } from './database';

function executorFor(database: SQLiteDatabase): SqlExecutor {
  return {
    exec: (sql: string): Promise<void> => database.execAsync(sql),
    run: async (sql: string, params: readonly SqlValue[]): Promise<void> => {
      await database.runAsync(sql, ...params);
    },
    first: (sql: string, params: readonly SqlValue[] = []): Promise<DatabaseRow | null> =>
      database.getFirstAsync<DatabaseRow>(sql, ...params),
    all: (sql: string, params: readonly SqlValue[] = []): Promise<DatabaseRow[]> =>
      database.getAllAsync<DatabaseRow>(sql, ...params),
  };
}

export function createExpoDatabase(database: SQLiteDatabase): Database {
  return {
    ...executorFor(database),
    transaction: async (work: (executor: SqlExecutor) => Promise<void>): Promise<void> => {
      const separator = database.databasePath.lastIndexOf('/');
      if (separator < 0) {
        throw new Error('La transacción requiere una base de datos persistente.');
      }
      const connection = await openDatabaseAsync(
        database.databasePath.slice(separator + 1),
        { ...database.options, useNewConnection: true },
        database.databasePath.slice(0, separator),
      );
      try {
        // Foreign-key enforcement belongs to each connection and must precede BEGIN.
        await connection.execAsync('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
        await connection.execAsync('BEGIN IMMEDIATE');
        try {
          await work(executorFor(connection));
          await connection.execAsync('COMMIT');
        } catch (error: unknown) {
          await connection.execAsync('ROLLBACK');
          throw error;
        }
      } finally {
        await connection.closeAsync();
      }
    },
  };
}
