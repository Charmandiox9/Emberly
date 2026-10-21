const accountSnapshot = `json_object('id', NEW.id, 'name', NEW.name,
  'initial_balance_minor', NEW.initial_balance_minor, 'currency', NEW.currency,
  'created_at', NEW.created_at, 'archived', NEW.archived)`;
const accountTriggers = ['INSERT', 'UPDATE']
  .map(
    (event) => `
  DROP TRIGGER outbox_accounts_${event.toLowerCase()};
  CREATE TRIGGER outbox_accounts_${event.toLowerCase()} AFTER ${event} ON accounts
  ${
    event === 'UPDATE'
      ? `WHEN OLD.name IS NOT NEW.name OR OLD.initial_balance_minor IS NOT NEW.initial_balance_minor
    OR OLD.currency IS NOT NEW.currency OR OLD.created_at IS NOT NEW.created_at OR OLD.archived IS NOT NEW.archived`
      : ''
  }
  BEGIN
    INSERT INTO sync_entities (entity_type, entity_id, local_revision, deleted) VALUES ('account', NEW.id, 1, 0)
    ON CONFLICT (entity_type, entity_id) DO UPDATE SET local_revision = local_revision + 1, deleted = 0;
    INSERT INTO sync_outbox (operation_id, entity_type, entity_id, local_revision, action, payload_json)
    SELECT lower(hex(randomblob(16))), 'account', NEW.id, local_revision, 'upsert', ${accountSnapshot}
    FROM sync_entities WHERE entity_type = 'account' AND entity_id = NEW.id;
  END;
`,
  )
  .join('\n');

const transferTriggers = ['INSERT', 'UPDATE']
  .map(
    (event) => `
  CREATE TRIGGER outbox_transfers_${event.toLowerCase()} AFTER ${event} ON transfers
  ${event === 'UPDATE' ? 'WHEN OLD.reversed_at IS NOT NEW.reversed_at' : ''}
  BEGIN
    INSERT INTO transfer_sync_state (transfer_id, revision) VALUES (NEW.id, 1)
    ON CONFLICT (transfer_id) DO UPDATE SET revision = revision + 1;
    INSERT INTO transfer_outbox (operation_id, entity_type, entity_id, local_revision, action, payload_json)
    SELECT lower(hex(randomblob(16))), 'transfer', NEW.id, revision, 'upsert', json_object(
      'id', NEW.id, 'source_account_id', NEW.source_account_id, 'destination_account_id', NEW.destination_account_id,
      'amount_minor', NEW.amount_minor, 'description', NEW.description, 'business_date', NEW.business_date,
      'created_at', NEW.created_at, 'reversed_at', COALESCE(NEW.reversed_at, ''))
    FROM transfer_sync_state WHERE transfer_id = NEW.id;
  END;
`,
  )
  .join('\n');

export const transfersMigrationSql = `
  ALTER TABLE accounts ADD COLUMN archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1));
  ${accountTriggers}
  CREATE TRIGGER movements_active_account BEFORE INSERT ON movements
  WHEN (SELECT archived FROM accounts WHERE id = NEW.account_id) = 1
  BEGIN SELECT RAISE(ABORT, 'Account is archived'); END;
  CREATE TRIGGER movements_active_destination BEFORE UPDATE OF account_id ON movements
  WHEN NEW.account_id IS NOT OLD.account_id AND (SELECT archived FROM accounts WHERE id = NEW.account_id) = 1
  BEGIN SELECT RAISE(ABORT, 'Account is archived'); END;
  CREATE TABLE transfers (
    id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) BETWEEN 1 AND 128),
    source_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    destination_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    amount_minor INTEGER NOT NULL CHECK (typeof(amount_minor) = 'integer' AND amount_minor BETWEEN 1 AND 9007199254740991),
    description TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 120),
    business_date TEXT NOT NULL CHECK (length(business_date) = 10),
    created_at TEXT NOT NULL,
    reversed_at TEXT,
    CHECK (source_account_id <> destination_account_id)
  );
  CREATE INDEX transfers_date ON transfers(business_date DESC, id DESC);
  CREATE INDEX transfers_source ON transfers(source_account_id);
  CREATE INDEX transfers_destination ON transfers(destination_account_id);
  CREATE TRIGGER transfers_active_accounts BEFORE INSERT ON transfers
  WHEN EXISTS (SELECT id FROM accounts WHERE id IN (NEW.source_account_id, NEW.destination_account_id) AND archived = 1)
  BEGIN SELECT RAISE(ABORT, 'Account is archived'); END;
  CREATE TRIGGER transfers_immutable BEFORE UPDATE ON transfers
  WHEN OLD.id IS NOT NEW.id OR OLD.source_account_id IS NOT NEW.source_account_id
    OR OLD.destination_account_id IS NOT NEW.destination_account_id OR OLD.amount_minor IS NOT NEW.amount_minor
    OR OLD.description IS NOT NEW.description OR OLD.business_date IS NOT NEW.business_date OR OLD.created_at IS NOT NEW.created_at
    OR (OLD.reversed_at IS NOT NULL AND OLD.reversed_at IS NOT NEW.reversed_at)
  BEGIN SELECT RAISE(ABORT, 'Reverse the transfer to correct it'); END;
  CREATE TRIGGER transfers_keep_audit BEFORE DELETE ON transfers
  BEGIN SELECT RAISE(ABORT, 'Reverse the transfer instead of deleting it'); END;
  CREATE TABLE transfer_sync_state (
    transfer_id TEXT PRIMARY KEY NOT NULL,
    revision INTEGER NOT NULL CHECK (typeof(revision) = 'integer' AND revision BETWEEN 1 AND 9007199254740991)
  );
  CREATE TABLE transfer_outbox (
    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_id TEXT UNIQUE NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type = 'transfer'),
    entity_id TEXT NOT NULL REFERENCES transfers(id),
    local_revision INTEGER NOT NULL,
    action TEXT NOT NULL CHECK (action = 'upsert'),
    payload_version INTEGER NOT NULL DEFAULT 1 CHECK (payload_version = 1),
    payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
    UNIQUE (entity_id, local_revision)
  );
  ${transferTriggers}
  CREATE TABLE sync_order (
    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_id TEXT UNIQUE NOT NULL
  );
  INSERT INTO sync_order (operation_id) SELECT operation_id FROM sync_outbox ORDER BY sequence;
  CREATE TRIGGER sync_outbox_order AFTER INSERT ON sync_outbox BEGIN
    INSERT INTO sync_order (operation_id) VALUES (NEW.operation_id);
  END;
  CREATE TRIGGER transfer_outbox_order AFTER INSERT ON transfer_outbox BEGIN
    INSERT INTO sync_order (operation_id) VALUES (NEW.operation_id);
  END;
  CREATE TRIGGER sync_outbox_order_cleanup AFTER DELETE ON sync_outbox BEGIN
    DELETE FROM sync_order WHERE operation_id = OLD.operation_id;
  END;
  CREATE TRIGGER transfer_outbox_order_cleanup AFTER DELETE ON transfer_outbox BEGIN
    DELETE FROM sync_order WHERE operation_id = OLD.operation_id;
  END;
`;
