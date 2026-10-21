import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openAccount, SqliteAccountRepository } from '../../src/modules/accounts';
import type {
  BackupAttachment,
  BackupFileIdentity,
  BackupFilePort,
} from '../../src/modules/backup/application/local-backup';
import {
  exportLocalBackup,
  restoreLocalBackup,
} from '../../src/modules/backup/application/local-backup';
import { createMoney } from '../../src/shared/domain/money';
import { migrateDatabase } from '../../src/shared/storage/migrations';
import { openTestDatabase, type TestDatabase } from '../helpers/node-database';

class MemoryBackupFiles implements BackupFilePort {
  contents = '';
  staged: BackupAttachment[] = [];
  replaced: { previous: readonly BackupFileIdentity[]; next: readonly BackupAttachment[] } | null =
    null;
  rollbackCount = 0;
  readonly attachmentContents = new Map<string, string>();

  async readAttachment(id: string): Promise<string> {
    const contents = this.attachmentContents.get(id);
    if (!contents) throw new Error('No se encontró el comprobante de prueba.');
    return contents;
  }

  async share(_name: string, contents: string): Promise<void> {
    this.contents = contents;
  }

  async readImport(): Promise<string> {
    return this.contents;
  }

  async stageAttachment(attachment: BackupAttachment): Promise<void> {
    this.staged.push(attachment);
  }

  async replaceAttachments(
    previous: readonly BackupFileIdentity[],
    next: readonly BackupAttachment[],
  ): Promise<void> {
    this.replaced = { previous, next };
  }

  async rollbackAttachments(): Promise<void> {
    this.rollbackCount += 1;
  }

  async finishAttachments(): Promise<void> {}

  async recoverAttachments(_current: readonly BackupFileIdentity[]): Promise<void> {}
}

const account = {
  id: 'backup-account',
  name: 'Cuenta de prueba',
  initialBalance: createMoney(125000),
  createdAt: '2026-10-20T12:00:00.000Z',
};
interface LegacyBackupFixture {
  schemaVersion: number;
  tables: Record<string, unknown>;
}
function isLegacyBackupFixture(value: unknown): value is LegacyBackupFixture {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'schemaVersion' in value &&
    typeof value.schemaVersion === 'number' &&
    'tables' in value &&
    typeof value.tables === 'object' &&
    value.tables !== null &&
    !Array.isArray(value.tables)
  );
}

describe('respaldo local sobre SQLite real', () => {
  let source: TestDatabase;
  let destination: TestDatabase;

  beforeEach(async () => {
    source = openTestDatabase();
    destination = openTestDatabase();
    await migrateDatabase(source);
    await migrateDatabase(destination);
  });

  afterEach(() => {
    source.close();
    destination.close();
  });

  it('exporta y restaura cuentas reemplazando el perfil dentro de SQLite', async () => {
    await openAccount(new SqliteAccountRepository(source), account);
    await openAccount(new SqliteAccountRepository(destination), {
      ...account,
      id: 'existing-account',
      name: 'Cuenta anterior',
    });
    const files = new MemoryBackupFiles();

    await exportLocalBackup(source, files, '2026-10-21T12:00:00.000Z');
    await restoreLocalBackup(destination, files, 'memory://backup');

    expect(await new SqliteAccountRepository(destination).list()).toEqual([account]);
  });

  it('actualiza respaldos de la versión previa cuando solo falta la tabla de fotos', async () => {
    await openAccount(new SqliteAccountRepository(source), account);
    const files = new MemoryBackupFiles();
    await exportLocalBackup(source, files, '2026-10-21T12:00:00.000Z');
    const decoded: unknown = JSON.parse(files.contents);
    if (!isLegacyBackupFixture(decoded)) throw new Error('El respaldo de prueba no es válido.');
    const legacy = decoded;
    legacy.schemaVersion = 10;
    delete legacy.tables['goal_images'];
    files.contents = JSON.stringify(legacy);

    await restoreLocalBackup(destination, files, 'memory://backup');

    expect(await new SqliteAccountRepository(destination).list()).toEqual([account]);
    expect(await destination.all('SELECT goal_id FROM goal_images')).toEqual([]);
  });

  it('restaura respaldos del esquema 9 y reconstruye el progreso de Ember', async () => {
    await openAccount(new SqliteAccountRepository(source), account);
    await source.run(
      'INSERT INTO goals (id, name, target_minor, deadline, created_at) VALUES (?, ?, ?, ?, ?)',
      ['legacy-goal', 'Viaje', 50000, null, account.createdAt],
    );
    const files = new MemoryBackupFiles();
    await exportLocalBackup(source, files, '2026-10-21T12:00:00.000Z');
    const decoded: unknown = JSON.parse(files.contents);
    if (!isLegacyBackupFixture(decoded)) throw new Error('El respaldo de prueba no es válido.');
    decoded.schemaVersion = 9;
    delete decoded.tables['goal_images'];
    delete decoded.tables['ember_activity_days'];
    delete decoded.tables['ember_achievements'];
    files.contents = JSON.stringify(decoded);

    await restoreLocalBackup(destination, files, 'memory://backup');

    expect(await new SqliteAccountRepository(destination).list()).toEqual([account]);
    expect(await destination.all('SELECT id, name FROM goals')).toEqual([
      { id: 'legacy-goal', name: 'Viaje' },
    ]);
    expect(await destination.all('SELECT activity_type FROM ember_activity_days')).toEqual([
      { activity_type: 'planning' },
    ]);
    expect(await destination.all('SELECT achievement_id FROM ember_achievements')).toEqual([
      { achievement_id: 'first-plan' },
    ]);
    expect(await destination.all('SELECT goal_id FROM goal_images')).toEqual([]);
  });

  it('rechaza un respaldo incompatible antes de cambiar los datos actuales', async () => {
    const existing = { ...account, id: 'existing-account', name: 'Cuenta anterior' };
    await openAccount(new SqliteAccountRepository(destination), existing);
    const files = new MemoryBackupFiles();
    files.contents = '{"format":"emberly-local-backup","version":99}';

    await expect(restoreLocalBackup(destination, files, 'memory://backup')).rejects.toThrow(
      'no es un respaldo de Emberly compatible',
    );
    expect(await new SqliteAccountRepository(destination).list()).toEqual([existing]);
  });

  it('rechaza un archivo corrupto sin modificar la base actual', async () => {
    const existing = { ...account, id: 'existing-account', name: 'Cuenta anterior' };
    await openAccount(new SqliteAccountRepository(destination), existing);
    const files = new MemoryBackupFiles();
    files.contents = '{"format":"emberly-local-backup","tables":';

    await expect(restoreLocalBackup(destination, files, 'memory://backup')).rejects.toThrow(
      'El archivo no contiene un JSON válido.',
    );
    expect(await new SqliteAccountRepository(destination).list()).toEqual([existing]);
    expect(files.rollbackCount).toBe(0);
  });

  it('incluye comprobantes listos y conserva sus identidades durante la restauración', async () => {
    const attachmentId = '00000000-0000-4000-8000-000000000001';
    const sha256 = 'a'.repeat(64);
    await insertMovementWithAttachment(
      source,
      'source-account',
      'source-movement',
      attachmentId,
      sha256,
    );
    await insertMovementWithAttachment(
      destination,
      'destination-account',
      'destination-movement',
      '00000000-0000-4000-8000-000000000002',
      'b'.repeat(64),
    );
    const files = new MemoryBackupFiles();
    files.attachmentContents.set(attachmentId, 'cGRm');

    await exportLocalBackup(source, files, '2026-10-21T12:00:00.000Z');
    await restoreLocalBackup(destination, files, 'memory://backup');

    expect(files.staged).toEqual([{ id: attachmentId, data: 'cGRm', sha256 }]);
    expect(files.replaced).toEqual({
      previous: [
        {
          id: '00000000-0000-4000-8000-000000000002',
          sha256: 'b'.repeat(64),
        },
      ],
      next: [{ id: attachmentId, data: 'cGRm', sha256 }],
    });
    expect(await destination.all('SELECT id, state FROM attachments')).toEqual([
      { id: attachmentId, state: 'ready' },
    ]);
    expect(files.rollbackCount).toBe(0);
  });

  it('incluye fotos de metas en los archivos restaurados junto a sus metadatos', async () => {
    const imageId = '00000000-0000-4000-8000-000000000010';
    const hash = 'c'.repeat(64);
    await new SqliteAccountRepository(source).save(account);
    await source.run(
      `INSERT INTO goals (id, name, target_minor, deadline, created_at) VALUES (?, ?, ?, ?, ?)`,
      ['image-goal', 'Viaje', 50000, null, account.createdAt],
    );
    await source.run(
      'INSERT INTO goal_images (goal_id, image_id, mime_type, size_bytes, sha256) VALUES (?, ?, ?, ?, ?)',
      ['image-goal', imageId, 'image/jpeg', 3, hash],
    );
    const files = new MemoryBackupFiles();
    files.attachmentContents.set(imageId, 'aW1n');

    await exportLocalBackup(source, files, '2026-10-21T12:00:00.000Z');
    await restoreLocalBackup(destination, files, 'memory://backup');

    expect(files.staged).toContainEqual({ id: imageId, data: 'aW1n', sha256: hash });
    expect(await destination.all('SELECT image_id, sha256 FROM goal_images')).toEqual([
      { image_id: imageId, sha256: hash },
    ]);
  });

  it('revierte SQLite y los archivos si los datos válidos estructuralmente violan una regla de integridad', async () => {
    const existing = { ...account, id: 'existing-account', name: 'Cuenta anterior' };
    await openAccount(new SqliteAccountRepository(destination), existing);
    await openAccount(new SqliteAccountRepository(source), account);
    const files = new MemoryBackupFiles();
    await exportLocalBackup(source, files, '2026-10-21T12:00:00.000Z');

    const payload = JSON.parse(files.contents) as {
      tables: Record<string, Record<string, unknown>[]>;
    };
    payload.tables['accounts']![0]!['name'] = '';
    files.contents = JSON.stringify(payload);

    await expect(restoreLocalBackup(destination, files, 'memory://backup')).rejects.toThrow();
    expect(await new SqliteAccountRepository(destination).list()).toEqual([existing]);
    expect(files.rollbackCount).toBe(1);
  });
});

async function insertMovementWithAttachment(
  database: TestDatabase,
  accountId: string,
  movementId: string,
  attachmentId: string,
  sha256: string,
): Promise<void> {
  await openAccount(new SqliteAccountRepository(database), {
    ...account,
    id: accountId,
  });
  await database.run(
    `INSERT INTO movements
      (id, account_id, category_id, kind, amount_minor, description, business_date, created_at)
      VALUES (?, ?, 'food', 'expense', 500, 'Compra de prueba', '2026-10-20', '2026-10-20T12:00:00.000Z')`,
    [movementId, accountId],
  );
  await database.run(
    `INSERT INTO attachments
      (id, movement_id, name, state, size_bytes, mime_type, sha256, created_at)
      VALUES (?, ?, 'comprobante.pdf', 'ready', 3, 'application/pdf', ?, '2026-10-20T12:00:00.000Z')`,
    [attachmentId, movementId, sha256],
  );
}
