import type { Database, DatabaseRow } from '../../../shared/storage/database';
import type { AttachmentRepository } from '../application/ports';
import {
  validateAttachmentId,
  validateAttachmentFileInfo,
  type Attachment,
  type AttachmentFileInfo,
} from '../domain/attachment';

function text(row: DatabaseRow, key: string): string {
  const value = row[key];
  if (typeof value !== 'string' || !value.length) throw new Error('Comprobante guardado inválido.');
  return value;
}

function read(row: DatabaseRow): Attachment {
  const id = text(row, 'id');
  validateAttachmentId(id);
  const state = row['state'];
  if (state !== 'preparing' && state !== 'ready' && state !== 'failed')
    throw new Error('Estado inválido.');
  let file: AttachmentFileInfo | null = null;
  if (state === 'ready') {
    const sizeBytes = row['size_bytes'];
    const mimeType = row['mime_type'];
    const sha256 = text(row, 'sha256');
    if (
      typeof sizeBytes !== 'number' ||
      !Number.isSafeInteger(sizeBytes) ||
      sizeBytes < 1 ||
      sizeBytes > 10485760 ||
      (mimeType !== 'application/pdf' &&
        mimeType !== 'image/jpeg' &&
        mimeType !== 'image/png' &&
        mimeType !== 'image/webp') ||
      !/^[a-f0-9]{64}$/.test(sha256)
    )
      throw new Error('Archivo guardado inválido.');
    file = { sizeBytes, mimeType, sha256 };
  }
  return {
    id,
    movementId: text(row, 'movement_id'),
    name: text(row, 'name'),
    state,
    file,
    sourceUri: row['source_uri'] === null ? null : text(row, 'source_uri'),
    createdAt: text(row, 'created_at'),
  };
}

export class SqliteAttachmentRepository implements AttachmentRepository {
  constructor(private readonly database: Database) {}

  async list(movementId: string): Promise<readonly Attachment[]> {
    return (
      await this.database.all(
        'SELECT * FROM attachments WHERE movement_id = ? ORDER BY created_at, id',
        [movementId],
      )
    ).map(read);
  }
  async prepare(attachment: Attachment): Promise<void> {
    validateAttachmentId(attachment.id);
    if (
      !attachment.sourceUri ||
      (!attachment.sourceUri.startsWith('file://') &&
        !attachment.sourceUri.startsWith('content://'))
    )
      throw new Error('Origen local inválido.');
    if (new Date(attachment.createdAt).toISOString() !== attachment.createdAt)
      throw new Error('Fecha de comprobante inválida.');
    await this.database.run(
      `INSERT INTO attachments (id, movement_id, name, source_uri, state, created_at)
      VALUES (?, ?, ?, ?, 'preparing', ?)`,
      [
        attachment.id,
        attachment.movementId,
        attachment.name,
        attachment.sourceUri,
        attachment.createdAt,
      ],
    );
  }
  async complete(id: string, info: AttachmentFileInfo): Promise<void> {
    validateAttachmentId(id);
    validateAttachmentFileInfo(info);
    await this.database.transaction(async (transaction) => {
      const existing = await transaction.first('SELECT id FROM attachments WHERE id = ?', [id]);
      if (!existing) throw new Error('El comprobante ya no existe.');
      await transaction.run(
        `UPDATE attachments SET state = 'ready', source_uri = NULL, size_bytes = ?, mime_type = ?, sha256 = ? WHERE id = ?`,
        [info.sizeBytes, info.mimeType, info.sha256, id],
      );
    });
  }
  async fail(id: string): Promise<void> {
    await this.database.run(
      "UPDATE attachments SET state = 'failed' WHERE id = ? AND state <> 'ready'",
      [id],
    );
  }
  async remove(id: string): Promise<void> {
    await this.database.run('DELETE FROM attachments WHERE id = ?', [id]);
  }
  async incomplete(): Promise<readonly Attachment[]> {
    return (
      await this.database.all(
        "SELECT * FROM attachments WHERE state <> 'ready' ORDER BY created_at, id",
      )
    ).map(read);
  }
  async cleanupIds(): Promise<readonly string[]> {
    return (await this.database.all('SELECT attachment_id FROM attachment_cleanup')).map((row) =>
      text(row, 'attachment_id'),
    );
  }
  async cleaned(id: string): Promise<void> {
    await this.database.run('DELETE FROM attachment_cleanup WHERE attachment_id = ?', [id]);
  }
}
