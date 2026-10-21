const categoryTriggers = ['INSERT', 'UPDATE']
  .map(
    (event) => `
    DROP TRIGGER outbox_categories_${event.toLowerCase()};
    CREATE TRIGGER outbox_categories_${event.toLowerCase()} AFTER ${event} ON categories
    ${event === 'UPDATE' ? 'WHEN OLD.name IS NOT NEW.name OR OLD.kind IS NOT NEW.kind OR OLD.archived IS NOT NEW.archived' : ''}
    BEGIN
      INSERT INTO sync_entities (entity_type, entity_id, local_revision, deleted)
      VALUES ('category', NEW.id, 1, 0)
      ON CONFLICT (entity_type, entity_id) DO UPDATE SET local_revision = local_revision + 1, deleted = 0;
      INSERT INTO sync_outbox (operation_id, entity_type, entity_id, local_revision, action, payload_json)
      SELECT lower(hex(randomblob(16))), 'category', NEW.id, local_revision, 'upsert',
        json_object('id', NEW.id, 'name', NEW.name, 'kind', NEW.kind, 'archived', NEW.archived)
      FROM sync_entities WHERE entity_type = 'category' AND entity_id = NEW.id;
    END;
  `,
  )
  .join('\n');

export const categoriesMigrationSql = `
  ALTER TABLE categories ADD COLUMN archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1));
  ${categoryTriggers}
  CREATE TRIGGER categories_immutable_kind BEFORE UPDATE OF kind ON categories
  WHEN OLD.kind IS NOT NEW.kind
  BEGIN SELECT RAISE(ABORT, 'Category kind is immutable'); END;
  CREATE TRIGGER movements_active_category BEFORE INSERT ON movements
  WHEN (SELECT archived FROM categories WHERE id = NEW.category_id) = 1
  BEGIN SELECT RAISE(ABORT, 'Category is archived'); END;
  CREATE TRIGGER movements_active_category_destination BEFORE UPDATE OF category_id, kind ON movements
  WHEN (NEW.category_id IS NOT OLD.category_id OR NEW.kind IS NOT OLD.kind)
    AND (SELECT archived FROM categories WHERE id = NEW.category_id) = 1
  BEGIN SELECT RAISE(ABORT, 'Category is archived'); END;
`;
