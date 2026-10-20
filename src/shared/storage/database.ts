export type SqlValue = string | number | null;
export interface DatabaseRow {
  readonly [column: string]: unknown;
}

export interface SqlExecutor {
  exec(sql: string): Promise<void>;
  run(sql: string, params: readonly SqlValue[]): Promise<void>;
  first(sql: string, params?: readonly SqlValue[]): Promise<DatabaseRow | null>;
  all(sql: string, params?: readonly SqlValue[]): Promise<readonly DatabaseRow[]>;
}

export interface Database extends SqlExecutor {
  transaction(work: (executor: SqlExecutor) => Promise<void>): Promise<void>;
}
