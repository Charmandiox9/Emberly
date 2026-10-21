export const attachmentsMigrationSql = `
  CREATE TABLE attachments (
    id TEXT PRIMARY KEY NOT NULL CHECK (length(id) = 36),
    movement_id TEXT NOT NULL REFERENCES movements(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
    source_uri TEXT,
    state TEXT NOT NULL CHECK (state IN ('preparing', 'ready', 'failed')),
    size_bytes INTEGER,
    mime_type TEXT,
    sha256 TEXT,
    created_at TEXT NOT NULL,
    CHECK (state <> 'ready' OR (source_uri IS NULL
      AND typeof(size_bytes) = 'integer' AND size_bytes BETWEEN 1 AND 10485760
      AND mime_type IS NOT NULL AND mime_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
      AND sha256 IS NOT NULL AND length(sha256) = 64))
  );
  CREATE INDEX attachments_movement ON attachments(movement_id, created_at, id);
  CREATE TABLE attachment_cleanup (attachment_id TEXT PRIMARY KEY NOT NULL);
  CREATE TABLE attachment_outbox (
    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_id TEXT UNIQUE NOT NULL,
    attachment_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('upsert', 'delete')),
    payload_json TEXT NOT NULL CHECK (json_valid(payload_json))
  );
  CREATE TRIGGER attachments_limit BEFORE INSERT ON attachments
  WHEN (SELECT COUNT(*) FROM attachments WHERE movement_id = NEW.movement_id) >= 5
  BEGIN SELECT RAISE(ABORT, 'Maximum attachments reached'); END;
  CREATE TRIGGER attachments_immutable BEFORE UPDATE OF id, movement_id ON attachments
  WHEN NEW.id IS NOT OLD.id OR NEW.movement_id IS NOT OLD.movement_id
  BEGIN SELECT RAISE(ABORT, 'Attachment identifiers are immutable'); END;
  CREATE TRIGGER attachments_ready AFTER UPDATE ON attachments
  WHEN NEW.state = 'ready' AND (OLD.state <> 'ready' OR OLD.sha256 IS NOT NEW.sha256)
  BEGIN
    INSERT INTO attachment_outbox (operation_id, attachment_id, action, payload_json)
    VALUES (lower(hex(randomblob(16))), NEW.id, 'upsert', json_object(
      'id', NEW.id, 'movement_id', NEW.movement_id, 'name', NEW.name,
      'size_bytes', NEW.size_bytes, 'mime_type', NEW.mime_type,
      'sha256', NEW.sha256, 'created_at', NEW.created_at));
  END;
  CREATE TRIGGER attachments_deleted AFTER DELETE ON attachments
  BEGIN
    INSERT OR IGNORE INTO attachment_cleanup (attachment_id) VALUES (OLD.id);
    INSERT INTO attachment_outbox (operation_id, attachment_id, action, payload_json)
    VALUES (lower(hex(randomblob(16))), OLD.id, 'delete', json_object('id', OLD.id));
  END;
`;
