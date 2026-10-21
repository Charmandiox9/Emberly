import { randomUUID } from 'expo-crypto';
import { AttachmentService, SqliteAttachmentRepository } from '../modules/attachments';
import { ExpoAttachmentFiles } from '../modules/attachments/native';
import type { Database } from '../shared/storage/database';

export function createAttachmentService(database: Database): AttachmentService {
  return new AttachmentService(
    new SqliteAttachmentRepository(database),
    new ExpoAttachmentFiles(),
    {
      nextId: randomUUID,
      now: () => new Date().toISOString(),
    },
  );
}
