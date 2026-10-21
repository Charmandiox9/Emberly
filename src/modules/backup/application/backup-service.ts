import { exportLocalBackup, restoreLocalBackup } from './local-backup';
import type { Database } from '../../../shared/storage/database';
import type { BackupFilePort } from './local-backup';

export interface LocalBackupService {
  export(): Promise<void>;
  restore(uri: string): Promise<void>;
}

export class SqliteLocalBackupService implements LocalBackupService {
  constructor(
    private readonly database: Database,
    private readonly files: BackupFilePort,
    private readonly now: () => string,
  ) {}

  export(): Promise<void> {
    return exportLocalBackup(this.database, this.files, this.now());
  }

  restore(uri: string): Promise<void> {
    return restoreLocalBackup(this.database, this.files, uri);
  }
}
