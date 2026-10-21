// Frozen schema-3 definitions: evolve these tables through a new migration.
interface TrackedTable {
  readonly table: string;
  readonly entity: string;
  readonly columns: readonly string[];
}

const trackedTables: readonly TrackedTable[] = [
  {
    table: 'accounts',
    entity: 'account',
    columns: ['id', 'name', 'initial_balance_minor', 'currency', 'created_at'],
  },
  { table: 'categories', entity: 'category', columns: ['id', 'name', 'kind'] },
  {
    table: 'movements',
    entity: 'movement',
    columns: [
      'id',
      'account_id',
      'category_id',
      'kind',
      'amount_minor',
      'description',
      'business_date',
      'created_at',
    ],
  },
];

function snapshot(table: TrackedTable, prefix: string): string {
  return `json_object(${table.columns.map((column) => `'${column}', ${prefix}.${column}`).join(', ')})`;
}

function triggers(table: TrackedTable): string {
  const updates = table.columns.map((column) => `OLD.${column} IS NOT NEW.${column}`).join(' OR ');
  const changes = ['INSERT', 'UPDATE', 'DELETE'].map((event) => {
    const deleted = event === 'DELETE';
    const row = deleted ? 'OLD' : 'NEW';
    const payload = deleted ? `json_object('id', OLD.id)` : snapshot(table, row);
    return `
      CREATE TRIGGER outbox_${table.table}_${event.toLowerCase()}
      AFTER ${event} ON ${table.table}
      ${event === 'UPDATE' ? `WHEN ${updates}` : ''}
      BEGIN
        INSERT INTO sync_entities (entity_type, entity_id, local_revision, deleted)
        VALUES ('${table.entity}', ${row}.id, 1, ${deleted ? 1 : 0})
        ON CONFLICT (entity_type, entity_id) DO UPDATE SET
          local_revision = local_revision + 1, deleted = excluded.deleted;
        INSERT INTO sync_outbox (operation_id, entity_type, entity_id, local_revision, action, payload_json)
        SELECT lower(hex(randomblob(16))), entity_type, entity_id, local_revision,
          '${deleted ? 'delete' : 'upsert'}', ${payload}
        FROM sync_entities WHERE entity_type = '${table.entity}' AND entity_id = ${row}.id;
      END;
    `;
  });
  return `
    CREATE TRIGGER outbox_${table.table}_immutable_id BEFORE UPDATE OF id ON ${table.table}
    WHEN OLD.id IS NOT NEW.id BEGIN SELECT RAISE(ABORT, 'Entity identifiers are immutable'); END;
    ${changes.join('\n')}
  `;
}

export const outboxMigrationSql = `
  CREATE TABLE sync_entities (
    entity_type TEXT NOT NULL CHECK (entity_type IN ('account', 'category', 'movement')),
    entity_id TEXT NOT NULL,
    local_revision INTEGER NOT NULL CHECK (typeof(local_revision) = 'integer'
      AND local_revision BETWEEN 1 AND 9007199254740991),
    deleted INTEGER NOT NULL CHECK (deleted IN (0, 1)),
    PRIMARY KEY (entity_type, entity_id)
  );
  CREATE TABLE sync_outbox (
    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_id TEXT UNIQUE NOT NULL CHECK (length(operation_id) = 32),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    local_revision INTEGER NOT NULL CHECK (typeof(local_revision) = 'integer'
      AND local_revision BETWEEN 1 AND 9007199254740991),
    action TEXT NOT NULL CHECK (action IN ('upsert', 'delete')),
    payload_version INTEGER NOT NULL DEFAULT 1 CHECK (payload_version = 1),
    payload_json TEXT NOT NULL CHECK (json_valid(payload_json)
      AND json_type(payload_json) = 'object'
      AND json_type(payload_json, '$.id') IS 'text'
      AND json_extract(payload_json, '$.id') IS entity_id),
    UNIQUE (entity_type, entity_id, local_revision),
    FOREIGN KEY (entity_type, entity_id) REFERENCES sync_entities(entity_type, entity_id)
  );
  ${trackedTables
    .map(
      (table) => `
    INSERT INTO sync_entities (entity_type, entity_id, local_revision, deleted)
    SELECT '${table.entity}', id, 1, 0 FROM ${table.table};
    INSERT INTO sync_outbox (operation_id, entity_type, entity_id, local_revision, action, payload_json)
    SELECT lower(hex(randomblob(16))), '${table.entity}', id, 1, 'upsert', ${snapshot(table, 'source')}
    FROM ${table.table} AS source ORDER BY id;
  `,
    )
    .join('\n')}
  ${trackedTables.map(triggers).join('\n')}
`;
