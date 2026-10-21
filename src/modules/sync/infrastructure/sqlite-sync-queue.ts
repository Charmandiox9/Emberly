import type { DatabaseRow, SqlExecutor } from '../../../shared/storage/database';
import type { PendingChange, SyncQueue, SyncSnapshot } from '../application/sync-queue';

interface MutableSnapshot {
  [field: string]: string | number;
}

function text(row: DatabaseRow, field: string): string {
  const value = row[field];
  if (typeof value !== 'string' || !value.length) throw new Error('Cambio pendiente inválido.');
  return value;
}

function integer(row: DatabaseRow, field: string, minimum = 1): number {
  const value = row[field];
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum)
    throw new Error('Contador de sincronización inválido.');
  return value;
}

function readSnapshot(json: string, id: string): SyncSnapshot {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
    throw new Error('Contenido pendiente inválido.');
  const result: MutableSnapshot = {};
  for (const key of Object.keys(parsed)) {
    const value: unknown = Reflect.get(parsed, key);
    if (typeof value !== 'string' && (typeof value !== 'number' || !Number.isSafeInteger(value)))
      throw new Error('Contenido pendiente inválido.');
    Object.defineProperty(result, key, { value, enumerable: true });
  }
  if (result['id'] !== id) throw new Error('Identificador pendiente inválido.');
  return Object.freeze(result);
}

function readChange(row: DatabaseRow): PendingChange {
  const entityType = row['entity_type'];
  const action = row['action'];
  const operationId = text(row, 'operation_id');
  if (
    (entityType !== 'account' &&
      entityType !== 'category' &&
      entityType !== 'movement' &&
      entityType !== 'transfer' &&
      entityType !== 'budget' &&
      entityType !== 'goal' &&
      entityType !== 'goal_allocation') ||
    (action !== 'upsert' && action !== 'delete') ||
    row['payload_version'] !== 1 ||
    !/^[a-f0-9]{32}$/.test(operationId)
  )
    throw new Error('Formato de cambio pendiente no compatible.');
  const entityId = text(row, 'entity_id');
  return Object.freeze({
    sequence: integer(row, 'sequence'),
    operationId,
    entityType,
    entityId,
    localRevision: integer(row, 'local_revision'),
    action,
    payloadVersion: 1,
    snapshot: readSnapshot(text(row, 'payload_json'), entityId),
  });
}

export class SqliteSyncQueue implements SyncQueue {
  constructor(private readonly database: SqlExecutor) {}

  async listPending(limit = 100): Promise<readonly PendingChange[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new Error('El lote debe contener entre 1 y 100 cambios.');
    const rows = await this.database.all(
      `SELECT o.sequence, changes.* FROM sync_order o JOIN (
        SELECT operation_id, entity_type, entity_id, local_revision, action, payload_version, payload_json FROM sync_outbox
        UNION ALL
        SELECT operation_id, entity_type, entity_id, local_revision, action, payload_version, payload_json FROM transfer_outbox
        UNION ALL
        SELECT operation_id, entity_type, entity_id, local_revision, action, payload_version, payload_json FROM budget_outbox
        UNION ALL
        SELECT operation_id, entity_type, entity_id, local_revision, action, payload_version, payload_json FROM goal_outbox
      ) changes ON changes.operation_id = o.operation_id ORDER BY o.sequence LIMIT ?`,
      [limit],
    );
    return rows.map(readChange);
  }

  async countPending(): Promise<number> {
    const row = await this.database.first(
      'SELECT (SELECT COUNT(*) FROM sync_outbox) + (SELECT COUNT(*) FROM transfer_outbox) + (SELECT COUNT(*) FROM budget_outbox) + (SELECT COUNT(*) FROM goal_outbox) AS count',
    );
    if (!row) throw new Error('No se pudo consultar la cola.');
    return integer(row, 'count', 0);
  }
}
