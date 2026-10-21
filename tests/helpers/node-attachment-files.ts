import { createHash } from 'node:crypto';
import { copyFile, readFile, rename, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type {
  Attachment,
  AttachmentFileInfo,
  AttachmentFiles,
} from '../../src/modules/attachments';
import {
  attachmentSizeLimit,
  detectAttachmentMime,
  validateAttachmentId,
} from '../../src/modules/attachments/domain/attachment';

// Test adapter: real files exercise coordination with SQLite, not Expo's native bridge.
export class NodeAttachmentFiles implements AttachmentFiles {
  failCopy = false;
  failCleanup = false;
  interruptAfterCopy = false;
  constructor(private readonly directory: string) {}

  private path(id: string, partial = false): string {
    validateAttachmentId(id);
    return join(this.directory, `${id}${partial ? '.part' : '.bin'}`);
  }
  async copy(uri: string, id: string): Promise<AttachmentFileInfo> {
    if (this.failCopy) throw new Error('Simulated disk failure');
    const source = fileURLToPath(uri);
    if ((await stat(source)).size > attachmentSizeLimit) throw new Error('File too large');
    await copyFile(source, this.path(id, true));
    const bytes = await readFile(this.path(id, true));
    const info: AttachmentFileInfo = {
      sizeBytes: bytes.length,
      mimeType: detectAttachmentMime(bytes),
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
    await rename(this.path(id, true), this.path(id));
    if (this.interruptAfterCopy) throw new Error('Simulated interruption after final rename');
    return info;
  }
  async inspect(id: string): Promise<AttachmentFileInfo | null> {
    let bytes: Buffer;
    try {
      bytes = await readFile(this.path(id));
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
      throw error;
    }
    return {
      sizeBytes: bytes.length,
      mimeType: detectAttachmentMime(bytes),
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
  }
  async remove(id: string): Promise<void> {
    if (this.failCleanup) throw new Error('Simulated cleanup failure');
    await rm(this.path(id), { force: true });
    await rm(this.path(id, true), { force: true });
  }
  uri(id: string): string {
    return pathToFileURL(this.path(id)).href;
  }
  async share(attachment: Attachment): Promise<void> {
    if (!(await this.inspect(attachment.id))) throw new Error('Missing file');
  }
}
