const tracked = [
  {
    table: 'goals',
    entity: 'goal',
    fields: ['id', 'name', 'target_minor', 'deadline', 'created_at'],
    updates:
      'OLD.name IS NOT NEW.name OR OLD.target_minor IS NOT NEW.target_minor OR OLD.deadline IS NOT NEW.deadline',
  },
  {
    table: 'goal_allocations',
    entity: 'goal_allocation',
    fields: ['id', 'goal_id', 'kind', 'amount_minor', 'created_at'],
    updates: '',
  },
] satisfies readonly GoalTracking[];
interface GoalTracking {
  readonly table: string;
  readonly entity: string;
  readonly fields: readonly string[];
  readonly updates: string;
}
const outboxTriggers = tracked
  .map((trackedTable) =>
    (trackedTable.table === 'goals' ? ['INSERT', 'UPDATE'] : ['INSERT'])
      .map(
        (event) => `
  CREATE TRIGGER outbox_${trackedTable.table}_${event.toLowerCase()} AFTER ${event} ON ${trackedTable.table}
  ${event === 'UPDATE' ? `WHEN ${trackedTable.updates}` : ''}
  BEGIN
    INSERT INTO goal_sync_state (entity_type, entity_id, revision) VALUES ('${trackedTable.entity}', NEW.id, 1)
    ON CONFLICT (entity_type, entity_id) DO UPDATE SET revision = revision + 1;
    INSERT INTO goal_outbox (operation_id, entity_type, entity_id, local_revision, action, payload_json)
    SELECT lower(hex(randomblob(16))), '${trackedTable.entity}', NEW.id, revision, 'upsert',
      json_object(${trackedTable.fields.map((field) => `'${field}', ${field === 'deadline' ? "COALESCE(NEW.deadline, '')" : `NEW.${field}`}`).join(', ')})
    FROM goal_sync_state WHERE entity_type = '${trackedTable.entity}' AND entity_id = NEW.id;
  END;
`,
      )
      .join('\n'),
  )
  .join('\n');

export const goalsMigrationSql = `
  CREATE TABLE goals (
    id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) BETWEEN 1 AND 128),
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
    target_minor INTEGER NOT NULL CHECK (typeof(target_minor) = 'integer' AND target_minor BETWEEN 1 AND 9007199254740991),
    deadline TEXT,
    created_at TEXT NOT NULL,
    assigned_minor INTEGER NOT NULL DEFAULT 0 CHECK (typeof(assigned_minor) = 'integer' AND assigned_minor BETWEEN 0 AND 9007199254740991)
  );
  CREATE TRIGGER goals_start_empty BEFORE INSERT ON goals WHEN NEW.assigned_minor <> 0
  BEGIN SELECT RAISE(ABORT, 'Goals start without assignments'); END;
  CREATE TRIGGER goals_immutable BEFORE UPDATE ON goals WHEN OLD.id IS NOT NEW.id OR OLD.created_at IS NOT NEW.created_at
  BEGIN SELECT RAISE(ABORT, 'Goal identity is immutable'); END;
  CREATE TRIGGER goals_keep_history BEFORE DELETE ON goals
  BEGIN SELECT RAISE(ABORT, 'Keep goal history'); END;
  CREATE TABLE goal_allocations (
    id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) BETWEEN 1 AND 128),
    goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE RESTRICT,
    kind TEXT NOT NULL CHECK (kind IN ('contribute', 'withdraw')),
    amount_minor INTEGER NOT NULL CHECK (typeof(amount_minor) = 'integer' AND amount_minor BETWEEN 1 AND 9007199254740991),
    created_at TEXT NOT NULL
  );
  CREATE INDEX goal_allocations_history ON goal_allocations(goal_id, created_at DESC, id DESC);
  CREATE TRIGGER goal_allocations_limits BEFORE INSERT ON goal_allocations
  WHEN (NEW.kind = 'withdraw' AND NEW.amount_minor > (SELECT assigned_minor FROM goals WHERE id = NEW.goal_id))
    OR (NEW.kind = 'contribute' AND NEW.amount_minor > (SELECT target_minor - assigned_minor FROM goals WHERE id = NEW.goal_id))
  BEGIN SELECT RAISE(ABORT, 'Assignment exceeds goal limits'); END;
  CREATE TRIGGER goal_allocations_apply AFTER INSERT ON goal_allocations BEGIN
    UPDATE goals SET assigned_minor = assigned_minor + CASE WHEN NEW.kind = 'contribute' THEN NEW.amount_minor ELSE -NEW.amount_minor END
    WHERE id = NEW.goal_id;
  END;
  CREATE TRIGGER goal_allocations_immutable BEFORE UPDATE ON goal_allocations
  BEGIN SELECT RAISE(ABORT, 'Record an opposite assignment to correct it'); END;
  CREATE TRIGGER goal_allocations_keep_history BEFORE DELETE ON goal_allocations
  BEGIN SELECT RAISE(ABORT, 'Keep assignment history'); END;
  CREATE TABLE goal_sync_state (
    entity_type TEXT NOT NULL CHECK (entity_type IN ('goal', 'goal_allocation')),
    entity_id TEXT NOT NULL,
    revision INTEGER NOT NULL CHECK (typeof(revision) = 'integer' AND revision BETWEEN 1 AND 9007199254740991),
    PRIMARY KEY (entity_type, entity_id)
  );
  CREATE TABLE goal_outbox (
    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_id TEXT UNIQUE NOT NULL CHECK (length(operation_id) = 32),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('goal', 'goal_allocation')),
    entity_id TEXT NOT NULL,
    local_revision INTEGER NOT NULL CHECK (typeof(local_revision) = 'integer' AND local_revision BETWEEN 1 AND 9007199254740991),
    action TEXT NOT NULL CHECK (action = 'upsert'),
    payload_version INTEGER NOT NULL DEFAULT 1 CHECK (payload_version = 1),
    payload_json TEXT NOT NULL CHECK (json_valid(payload_json) AND json_type(payload_json) = 'object'
      AND json_type(payload_json, '$.id') IS 'text' AND json_extract(payload_json, '$.id') IS entity_id),
    UNIQUE (entity_type, entity_id, local_revision),
    FOREIGN KEY (entity_type, entity_id) REFERENCES goal_sync_state(entity_type, entity_id)
  );
  CREATE TRIGGER goal_outbox_order AFTER INSERT ON goal_outbox BEGIN
    INSERT INTO sync_order (operation_id) VALUES (NEW.operation_id);
  END;
  CREATE TRIGGER goal_outbox_order_cleanup AFTER DELETE ON goal_outbox BEGIN
    DELETE FROM sync_order WHERE operation_id = OLD.operation_id;
  END;
  ${outboxTriggers}
`;
