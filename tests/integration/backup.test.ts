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

  async readAttachment(): Promise<string> {
    throw new Error('No se esperaban comprobantes en esta prueba.');
  }

  async share(_name: string, contents: string): Promise<void> {
    this.contents = contents;
  }

  async readImport(): Promise<string> {
    return this.contents;
  }

  async stageAttachment(_attachment: BackupAttachment): Promise<void> {}

  async replaceAttachments(
    _previous: readonly BackupFileIdentity[],
    _next: readonly BackupAttachment[],
  ): Promise<void> {}

  async rollbackAttachments(): Promise<void> {}

  async finishAttachments(): Promise<void> {}

  async recoverAttachments(_current: readonly BackupFileIdentity[]): Promise<void> {}
}

const account = {
  id: 'backup-account',
  name: 'Cuenta de prueba',
  initialBalance: createMoney(125000),
  createdAt: '2026-10-20T12:00:00.000Z',
};

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
});
