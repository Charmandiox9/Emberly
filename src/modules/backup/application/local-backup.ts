import type {
  Database,
  DatabaseRow,
  SqlValue,
  SqlExecutor,
} from '../../../shared/storage/database';
import { schemaVersion } from '../../../shared/storage/migrations';

const tables = [
  'accounts',
  'categories',
  'movements',
  'transfers',
  'attachments',
  'goals',
  'goal_images',
  'goal_allocations',
  'budgets',
  'reminder_settings',
  'sync_entities',
  'sync_outbox',
  'transfer_sync_state',
  'transfer_outbox',
  'budget_sync_state',
  'budget_outbox',
  'goal_sync_state',
  'goal_outbox',
  'sync_order',
  'attachment_cleanup',
  'attachment_outbox',
  'ember_activity_days',
  'ember_achievements',
] as const;

interface BackupPayload {
  readonly format: 'emberly-local-backup';
  readonly version: 1;
  readonly schemaVersion: number;
  readonly exportedAt: string;
  readonly tables: Readonly<Record<string, readonly DatabaseRow[]>>;
  readonly attachmentFiles: Readonly<Record<string, string>>;
}

export interface BackupFilePort {
  readAttachment(id: string, expectedSha256: string): Promise<string>;
  share(name: string, contents: string): Promise<void>;
  readImport(uri: string): Promise<string>;
  stageAttachment(attachment: BackupAttachment): Promise<void>;
  replaceAttachments(
    previous: readonly BackupFileIdentity[],
    next: readonly BackupAttachment[],
  ): Promise<void>;
  rollbackAttachments(): Promise<void>;
  finishAttachments(): Promise<void>;
  recoverAttachments(current: readonly BackupFileIdentity[]): Promise<void>;
}

export interface BackupAttachment {
  readonly id: string;
  readonly data: string;
  readonly sha256: string;
}

export interface BackupFileIdentity {
  readonly id: string;
  readonly sha256: string;
}

export interface LocalBackupPort {
  export(): Promise<void>;
  restore(uri: string): Promise<void>;
}

const deleteOrder = [...tables].reverse();

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sqlValue(value: unknown): SqlValue {
  if (
    value === null ||
    typeof value === 'string' ||
    (typeof value === 'number' && Number.isSafeInteger(value))
  )
    return value;
  throw new Error('El respaldo contiene un valor incompatible con SQLite.');
}

function readPayload(contents: string): BackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error('El archivo no contiene un JSON válido.');
  }
  if (!object(parsed) || parsed['format'] !== 'emberly-local-backup' || parsed['version'] !== 1)
    throw new Error('El archivo no es un respaldo de Emberly compatible.');
  const backupSchemaVersion = parsed['schemaVersion'];
  if (
    typeof backupSchemaVersion !== 'number' ||
    (backupSchemaVersion !== schemaVersion &&
      backupSchemaVersion !== schemaVersion - 1 &&
      backupSchemaVersion !== schemaVersion - 2)
  )
    throw new Error(
      'El respaldo pertenece a otra versión de los datos. Actualiza Emberly o usa un respaldo compatible.',
    );
  const exportedAt = parsed['exportedAt'];
  const instant = typeof exportedAt === 'string' ? new Date(exportedAt) : null;
  if (!instant || !Number.isFinite(instant.getTime()) || instant.toISOString() !== exportedAt)
    throw new Error('La fecha del respaldo no es válida.');
  if (!object(parsed['tables']) || !object(parsed['attachmentFiles']))
    throw new Error('El respaldo está incompleto.');
  const sourceTables = parsed['tables'];
  const legacyTables: readonly string[] =
    backupSchemaVersion === schemaVersion - 2
      ? ['goal_images', 'ember_activity_days', 'ember_achievements']
      : backupSchemaVersion === schemaVersion - 1
        ? ['goal_images']
        : [];
  const expectedTables = tables.filter((table) => !legacyTables.includes(table));
  if (
    Object.keys(sourceTables).length !== expectedTables.length ||
    expectedTables.some((table) => !(table in sourceTables))
  )
    throw new Error('El respaldo no contiene todas las tablas esperadas.');
  const normalizedTables: Record<string, readonly DatabaseRow[]> = {};
  for (const table of tables) {
    const rows: unknown = sourceTables[table];
    if (rows === undefined && legacyTables.includes(table)) {
      normalizedTables[table] = [];
      continue;
    }
    if (!Array.isArray(rows) || !rows.every(object))
      throw new Error(`Los datos de ${table} no son válidos.`);
    normalizedTables[table] = rows;
  }
  const attachmentFiles: Record<string, string> = {};
  for (const [id, data] of Object.entries(parsed['attachmentFiles'])) {
    if (
      typeof data !== 'string' ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)
    )
      throw new Error('El contenido de un comprobante no es válido.');
    attachmentFiles[id] = data;
  }
  return {
    format: 'emberly-local-backup',
    version: 1,
    schemaVersion: backupSchemaVersion,
    exportedAt,
    tables: normalizedTables,
    attachmentFiles,
  };
}

async function validateTables(database: SqlExecutor, payload: BackupPayload): Promise<void> {
  for (const table of tables) {
    const expected = (await database.all(`PRAGMA table_info(${table})`)).map((row) => row['name']);
    if (!expected.length || expected.some((name) => typeof name !== 'string'))
      throw new Error('La estructura actual de SQLite no coincide con el respaldo.');
    for (const row of payload.tables[table] ?? []) {
      const columns = Object.keys(row);
      if (
        columns.length !== expected.length ||
        expected.some((name) => !columns.includes(String(name)))
      )
        throw new Error(`Las columnas de ${table} no coinciden con esta versión.`);
      for (const value of Object.values(row))
        if (
          value !== null &&
          typeof value !== 'string' &&
          (typeof value !== 'number' || !Number.isSafeInteger(value))
        )
          throw new Error(`Hay un valor no compatible en ${table}.`);
    }
  }
}

function backupFiles(payload: BackupPayload): readonly BackupAttachment[] {
  const files: BackupAttachment[] = [];
  const rows = payload.tables['attachments'] ?? [];
  const ready = new Set<string>();
  for (const row of rows) {
    if (row['state'] !== 'ready') continue;
    const id = row['id'];
    const sha256 = row['sha256'];
    if (typeof id !== 'string' || typeof sha256 !== 'string')
      throw new Error('Falta el archivo de un comprobante del respaldo.');
    const data = payload.attachmentFiles[id];
    if (typeof data !== 'string')
      throw new Error('Falta el archivo de un comprobante del respaldo.');
    ready.add(id);
    files.push({ id, sha256, data });
  }
  for (const row of payload.tables['goal_images'] ?? []) {
    const id = row['image_id'];
    const sha256 = row['sha256'];
    if (typeof id !== 'string' || typeof sha256 !== 'string')
      throw new Error('Falta la foto de una meta del respaldo.');
    const data = payload.attachmentFiles[id];
    if (typeof data !== 'string') throw new Error('Falta la foto de una meta del respaldo.');
    ready.add(id);
    files.push({ id, sha256, data });
  }
  if (Object.keys(payload.attachmentFiles).some((id) => !ready.has(id)))
    throw new Error('El respaldo incluye archivos sin metadatos asociados.');
  if (rows.some((row) => row['state'] !== 'ready'))
    throw new Error('El respaldo contiene comprobantes incompletos.');
  return files;
}

async function replaceRows(database: Database, payload: BackupPayload): Promise<void> {
  await database.transaction(async (transaction) => {
    const triggers = await transaction.all(
      "SELECT name, sql FROM sqlite_master WHERE type = 'trigger'",
    );
    for (const trigger of triggers) {
      const name = trigger['name'];
      const sql = trigger['sql'];
      if (typeof name !== 'string' || typeof sql !== 'string' || !/^CREATE TRIGGER/i.test(sql))
        throw new Error('No se pudieron preservar las reglas de integridad SQLite.');
      await transaction.exec(`DROP TRIGGER "${name.replaceAll('"', '""')}"`);
    }
    for (const table of deleteOrder) await transaction.run(`DELETE FROM ${table}`, []);
    for (const table of tables) {
      for (const row of payload.tables[table] ?? []) {
        const columns = Object.keys(row);
        const placeholders = columns.map(() => '?').join(', ');
        const safeValues = columns.map((column) => sqlValue(row[column]));
        await transaction.run(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
          safeValues,
        );
      }
    }
    if (payload.schemaVersion === schemaVersion - 2) {
      await transaction.exec(`
        INSERT OR IGNORE INTO ember_activity_days (activity_date, activity_type, first_recorded_at)
        SELECT substr(created_at, 1, 10), 'record', MIN(created_at) FROM movements GROUP BY substr(created_at, 1, 10);
        INSERT OR IGNORE INTO ember_activity_days (activity_date, activity_type, first_recorded_at)
        SELECT substr(created_at, 1, 10), 'record', MIN(created_at) FROM transfers GROUP BY substr(created_at, 1, 10);
        INSERT OR IGNORE INTO ember_activity_days (activity_date, activity_type, first_recorded_at)
        SELECT substr(created_at, 1, 10), 'planning', MIN(created_at) FROM budgets GROUP BY substr(created_at, 1, 10);
        INSERT OR IGNORE INTO ember_activity_days (activity_date, activity_type, first_recorded_at)
        SELECT substr(created_at, 1, 10), 'planning', MIN(created_at) FROM goals GROUP BY substr(created_at, 1, 10);
        INSERT OR IGNORE INTO ember_activity_days (activity_date, activity_type, first_recorded_at)
        SELECT substr(created_at, 1, 10), 'planning', MIN(created_at) FROM goal_allocations GROUP BY substr(created_at, 1, 10);
        INSERT OR IGNORE INTO ember_achievements (achievement_id, earned_at)
        SELECT 'first-record', MIN(first_recorded_at) FROM ember_activity_days WHERE activity_type = 'record' HAVING COUNT(*) > 0;
        INSERT OR IGNORE INTO ember_achievements (achievement_id, earned_at)
        SELECT 'first-plan', MIN(first_recorded_at) FROM ember_activity_days WHERE activity_type = 'planning' HAVING COUNT(*) > 0;
        INSERT OR IGNORE INTO ember_achievements (achievement_id, earned_at)
        SELECT 'first-review', MIN(first_recorded_at) FROM ember_activity_days WHERE activity_type = 'review' HAVING COUNT(*) > 0;
        INSERT OR IGNORE INTO ember_achievements (achievement_id, earned_at)
        SELECT 'three-active-days', MAX(first_recorded_at) FROM ember_activity_days HAVING COUNT(DISTINCT activity_date) >= 3;
        INSERT OR IGNORE INTO ember_achievements (achievement_id, earned_at)
        SELECT 'ten-active-days', MAX(first_recorded_at) FROM ember_activity_days HAVING COUNT(DISTINCT activity_date) >= 10;
      `);
    }
    await transaction.exec(`PRAGMA user_version = ${schemaVersion}`);
    for (const trigger of triggers) await transaction.exec(String(trigger['sql']));
  });
}

export async function restoreLocalBackup(
  database: Database,
  files: BackupFilePort,
  uri: string,
): Promise<void> {
  const currentRows = [
    ...(await database.all("SELECT id, sha256 FROM attachments WHERE state = 'ready'")),
    ...(await database.all('SELECT image_id AS id, sha256 FROM goal_images')),
  ];
  const current = currentRows.map((row): BackupFileIdentity => {
    if (typeof row['id'] !== 'string' || typeof row['sha256'] !== 'string')
      throw new Error('Los comprobantes actuales no son válidos.');
    return { id: row['id'], sha256: row['sha256'] };
  });
  await files.recoverAttachments(current);
  const payload = readPayload(await files.readImport(uri));
  await validateTables(database, payload);
  const next = backupFiles(payload);
  for (const attachment of next) await files.stageAttachment(attachment);
  await files.replaceAttachments(current, next);
  try {
    await replaceRows(database, payload);
  } catch (error: unknown) {
    await files.rollbackAttachments();
    throw error;
  }
  try {
    await files.finishAttachments();
  } catch {
    // The durable manifest lets the next launch finish cleanup safely.
  }
}

function serializableRow(row: DatabaseRow): DatabaseRow {
  const result: Record<string, SqlValue> = {};
  for (const [key, value] of Object.entries(row)) {
    if (
      typeof value !== 'string' &&
      (typeof value !== 'number' || !Number.isSafeInteger(value)) &&
      value !== null
    )
      throw new Error('La base contiene un dato que no se puede exportar.');
    result[key] = value;
  }
  return result;
}

export async function exportLocalBackup(
  database: Database,
  files: BackupFilePort,
  exportedAt: string,
): Promise<void> {
  const instant = new Date(exportedAt);
  if (!Number.isFinite(instant.getTime()) || instant.toISOString() !== exportedAt)
    throw new Error('La fecha del respaldo no es válida.');

  let schemaVersion = 0;
  const rowsByTable: Record<string, readonly DatabaseRow[]> = {};
  await database.transaction(async (transaction) => {
    const version = await transaction.first('PRAGMA user_version');
    if (
      typeof version?.['user_version'] !== 'number' ||
      !Number.isSafeInteger(version['user_version']) ||
      version['user_version'] < 1
    )
      throw new Error('No se pudo leer la versión de los datos.');
    schemaVersion = version['user_version'];
    for (const table of tables) {
      rowsByTable[table] = (await transaction.all(`SELECT * FROM ${table}`)).map(serializableRow);
    }
  });

  const attachmentRows = rowsByTable['attachments'] ?? [];
  const attachmentFiles: Record<string, string> = {};
  for (const row of attachmentRows) {
    if (row['state'] !== 'ready')
      throw new Error('Completa o quita los comprobantes pendientes antes de crear el respaldo.');
    const id = row['id'];
    const hash = row['sha256'];
    if (typeof id !== 'string' || typeof hash !== 'string')
      throw new Error('Los metadatos de un comprobante no son válidos.');
    attachmentFiles[id] = await files.readAttachment(id, hash);
  }
  for (const row of rowsByTable['goal_images'] ?? []) {
    const id = row['image_id'];
    const hash = row['sha256'];
    if (typeof id !== 'string' || typeof hash !== 'string')
      throw new Error('Los metadatos de una foto de meta no son válidos.');
    attachmentFiles[id] = await files.readAttachment(id, hash);
  }

  const payload: BackupPayload = {
    format: 'emberly-local-backup',
    version: 1,
    schemaVersion,
    exportedAt,
    tables: rowsByTable,
    attachmentFiles,
  };
  const date = exportedAt.slice(0, 10);
  await files.share(`emberly-respaldo-${date}.json`, JSON.stringify(payload));
}
