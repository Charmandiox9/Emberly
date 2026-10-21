const budgetTriggers = ['INSERT', 'UPDATE', 'DELETE']
  .map((event) => {
    const deleted = event === 'DELETE';
    const row = deleted ? 'OLD' : 'NEW';
    const snapshot = deleted
      ? "json_object('id', OLD.id)"
      : `json_object('id', NEW.id,
    'category_id', NEW.category_id, 'month', NEW.month, 'limit_minor', NEW.limit_minor,
    'currency', NEW.currency, 'created_at', NEW.created_at)`;
    return `
    CREATE TRIGGER outbox_budgets_${event.toLowerCase()} AFTER ${event} ON budgets
    ${event === 'UPDATE' ? 'WHEN OLD.limit_minor IS NOT NEW.limit_minor' : ''}
    BEGIN
      INSERT INTO budget_sync_state (budget_id, revision, deleted) VALUES (${row}.id, 1, ${deleted ? 1 : 0})
      ON CONFLICT (budget_id) DO UPDATE SET revision = revision + 1, deleted = excluded.deleted;
      INSERT INTO budget_outbox (operation_id, entity_type, entity_id, local_revision, action, payload_json)
      SELECT lower(hex(randomblob(16))), 'budget', ${row}.id, revision, '${deleted ? 'delete' : 'upsert'}', ${snapshot}
      FROM budget_sync_state WHERE budget_id = ${row}.id;
    END;
  `;
  })
  .join('\n');

export const budgetsMigrationSql = `
  CREATE TABLE budgets (
    id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) BETWEEN 1 AND 128),
    category_id TEXT NOT NULL,
    category_kind TEXT NOT NULL DEFAULT 'expense' CHECK (category_kind = 'expense'),
    month TEXT NOT NULL CHECK (month GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'
      AND month >= '0001-01' AND month <= '9999-11' AND substr(month, 6, 2) BETWEEN '01' AND '12'),
    limit_minor INTEGER NOT NULL CHECK (typeof(limit_minor) = 'integer' AND limit_minor BETWEEN 1 AND 9007199254740991),
    currency TEXT NOT NULL CHECK (currency = 'CLP'),
    created_at TEXT NOT NULL,
    UNIQUE (category_id, month),
    FOREIGN KEY (category_id, category_kind) REFERENCES categories(id, kind) ON DELETE RESTRICT
  );
  CREATE INDEX budgets_month ON budgets(month, category_id);
  CREATE TRIGGER budgets_active_category BEFORE INSERT ON budgets
  WHEN (SELECT archived FROM categories WHERE id = NEW.category_id) = 1
  BEGIN SELECT RAISE(ABORT, 'Category is archived'); END;
  CREATE TRIGGER budgets_immutable BEFORE UPDATE ON budgets
  WHEN OLD.id IS NOT NEW.id OR OLD.category_id IS NOT NEW.category_id OR OLD.month IS NOT NEW.month
    OR OLD.currency IS NOT NEW.currency OR OLD.created_at IS NOT NEW.created_at
  BEGIN SELECT RAISE(ABORT, 'Only the budget limit can be updated'); END;
  CREATE TABLE budget_sync_state (
    budget_id TEXT PRIMARY KEY NOT NULL,
    revision INTEGER NOT NULL CHECK (typeof(revision) = 'integer' AND revision BETWEEN 1 AND 9007199254740991),
    deleted INTEGER NOT NULL CHECK (deleted IN (0, 1))
  );
  CREATE TABLE budget_outbox (
    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_id TEXT UNIQUE NOT NULL CHECK (length(operation_id) = 32),
    entity_type TEXT NOT NULL CHECK (entity_type = 'budget'),
    entity_id TEXT NOT NULL REFERENCES budget_sync_state(budget_id),
    local_revision INTEGER NOT NULL CHECK (typeof(local_revision) = 'integer' AND local_revision BETWEEN 1 AND 9007199254740991),
    action TEXT NOT NULL CHECK (action IN ('upsert', 'delete')),
    payload_version INTEGER NOT NULL DEFAULT 1 CHECK (payload_version = 1),
    payload_json TEXT NOT NULL CHECK (json_valid(payload_json) AND json_type(payload_json) = 'object'
      AND json_type(payload_json, '$.id') IS 'text' AND json_extract(payload_json, '$.id') IS entity_id),
    UNIQUE (entity_id, local_revision)
  );
  CREATE TRIGGER budget_outbox_order AFTER INSERT ON budget_outbox BEGIN
    INSERT INTO sync_order (operation_id) VALUES (NEW.operation_id);
  END;
  CREATE TRIGGER budget_outbox_order_cleanup AFTER DELETE ON budget_outbox BEGIN
    DELETE FROM sync_order WHERE operation_id = OLD.operation_id;
  END;
  ${budgetTriggers}
`;
