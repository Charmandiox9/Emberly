import { DatabaseSync } from 'node:sqlite';

import type {
  Database,
  DatabaseRow,
  SqlExecutor,
  SqlValue,
} from '../../src/shared/storage/database';

export interface TestDatabase extends Database {
  close(): void;
}

export function openTestDatabase(path = ':memory:'): TestDatabase {
  const native = new DatabaseSync(path);
  const executor: SqlExecutor = {
    exec(sql: string): Promise<void> {
      native.exec(sql);
      return Promise.resolve();
    },
    run(sql: string, params: readonly SqlValue[]): Promise<void> {
      native.prepare(sql).run(...params);
      return Promise.resolve();
    },
    first(sql: string, params: readonly SqlValue[] = []): Promise<DatabaseRow | null> {
      return Promise.resolve(native.prepare(sql).get(...params) ?? null);
    },
    all(sql: string, params: readonly SqlValue[] = []): Promise<readonly DatabaseRow[]> {
      return Promise.resolve(native.prepare(sql).all(...params));
    },
  };
  return {
    ...executor,
    async transaction(work: (transaction: SqlExecutor) => Promise<void>): Promise<void> {
      native.exec('BEGIN IMMEDIATE');
      try {
        await work(executor);
        native.exec('COMMIT');
      } catch (error: unknown) {
        native.exec('ROLLBACK');
        throw error;
      }
    },
    close(): void {
      native.close();
    },
  };
}
