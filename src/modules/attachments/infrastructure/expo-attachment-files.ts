import { AttachmentError } from '../domain/attachment';
import { CryptoDigestAlgorithm, digest } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import type { AttachmentFiles } from '../application/ports';
import {
  attachmentSizeLimit,
  detectAttachmentMime,
  validateAttachmentId,
  type Attachment,
  type AttachmentFileInfo,
} from '../domain/attachment';

function storedFile(id: string, partial = false): File {
  validateAttachmentId(id);
  return new File(Paths.document, 'attachments', `${id}${partial ? '.part' : '.bin'}`);
}

async function inspectFile(file: File): Promise<AttachmentFileInfo> {
  if (!file.exists || file.size < 1 || file.size > attachmentSizeLimit)
    throw new AttachmentError('El comprobante no está disponible o supera los 10 MB.');
  const bytes = await file.bytes();
  const mimeType = detectAttachmentMime(bytes);
  const hash = await digest(CryptoDigestAlgorithm.SHA256, bytes);
  return {
    sizeBytes: bytes.length,
    mimeType,
    sha256: Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join(''),
  };
}

export class ExpoAttachmentFiles implements AttachmentFiles {
  async verifyBackupRestoreFile(id: string, data: string, expectedSha256: string): Promise<void> {
    validateAttachmentId(id);
    const directory = new Directory(Paths.document, 'attachment-restore');
    directory.create({ intermediates: true, idempotent: true });
    const staged = new File(directory, `${id}.new`);
    if (staged.exists) staged.delete();
    void staged.create({ intermediates: true, overwrite: true });
    staged.write(data, { encoding: 'base64' });
    try {
      const info = await inspectFile(staged);
      if (info.sha256 !== expectedSha256)
        throw new AttachmentError('Un comprobante no coincide con la huella del respaldo.');
    } catch (error: unknown) {
      if (staged.exists) staged.delete();
      throw error;
    }
  }

  async verifyStagedBackupRestoreFile(id: string, expectedSha256: string): Promise<boolean> {
    const staged = new File(Paths.document, 'attachment-restore', `${id}.new`);
    if (!staged.exists) return false;
    return (await inspectFile(staged)).sha256 === expectedSha256;
  }

  async moveStagedBackupRestoreFile(id: string): Promise<void> {
    validateAttachmentId(id);
    const staged = new File(Paths.document, 'attachment-restore', `${id}.new`);
    const destination = storedFile(id);
    if (!staged.exists) throw new AttachmentError('Falta un archivo preparado para restaurar.');
    if (destination.exists) await destination.delete();
    await new Directory(Paths.document, 'attachments').create({
      intermediates: true,
      idempotent: true,
    });
    await staged.move(destination);
  }

  async moveBackupRestoreFileToRollback(id: string): Promise<void> {
    validateAttachmentId(id);
    const source = storedFile(id);
    if (!source.exists) return;
    const directory = new Directory(Paths.document, 'attachment-restore');
    await directory.create({ intermediates: true, idempotent: true });
    const rollback = new File(directory, `${id}.old`);
    if (rollback.exists) await rollback.delete();
    await source.move(rollback);
  }

  async restoreBackupRollbackFile(id: string): Promise<void> {
    validateAttachmentId(id);
    const rollback = new File(Paths.document, 'attachment-restore', `${id}.old`);
    const destination = storedFile(id);
    if (!rollback.exists) return;
    if (destination.exists) await destination.delete();
    await new Directory(Paths.document, 'attachments').create({
      intermediates: true,
      idempotent: true,
    });
    await rollback.move(destination);
  }

  async removeBackupRestoreFiles(id: string): Promise<void> {
    validateAttachmentId(id);
    for (const suffix of ['.new', '.old']) {
      const file = new File(Paths.document, 'attachment-restore', `${id}${suffix}`);
      if (file.exists) await file.delete();
    }
  }

  async removeStoredAttachment(id: string): Promise<void> {
    const file = storedFile(id);
    if (file.exists) await file.delete();
  }

  async readBackupFile(id: string, expectedSha256: string): Promise<string> {
    const file = storedFile(id);
    if (!file.exists) throw new AttachmentError('Falta un comprobante; el respaldo se canceló.');
    const info = await inspectFile(file);
    if (info.sha256 !== expectedSha256)
      throw new AttachmentError('Un comprobante cambió; el respaldo se canceló.');
    return file.base64();
  }

  async copy(sourceUri: string, id: string): Promise<AttachmentFileInfo> {
    const source = new File(sourceUri);
    const size = source.size;
    if (!source.exists || size < 1 || size > attachmentSizeLimit)
      throw new AttachmentError('Selecciona un archivo de hasta 10 MB que siga disponible.');
    if (Paths.availableDiskSpace < size + 1024 * 1024)
      throw new AttachmentError(
        'No hay espacio suficiente. Libera espacio y reintenta el comprobante.',
      );
    new Directory(Paths.document, 'attachments').create({ intermediates: true, idempotent: true });
    const partial = storedFile(id, true);
    const destination = storedFile(id);
    if (partial.exists) partial.delete();
    await source.copy(partial);
    if (partial.size !== size)
      throw new AttachmentError('La copia del comprobante quedó incompleta.');
    const info = await inspectFile(partial);
    // The final name appears only after a complete, validated copy.
    await partial.move(destination);
    return info;
  }
  async inspect(id: string): Promise<AttachmentFileInfo | null> {
    const file = storedFile(id);
    return file.exists ? inspectFile(file) : null;
  }
  remove(id: string): Promise<void> {
    for (const file of [storedFile(id), storedFile(id, true)]) if (file.exists) file.delete();
    return Promise.resolve();
  }
  uri(id: string): string {
    return storedFile(id).uri;
  }

  async share(attachment: Attachment): Promise<void> {
    if (attachment.state !== 'ready' || !attachment.file)
      throw new AttachmentError('El comprobante todavía no está disponible.');
    const actual = await this.inspect(attachment.id);
    if (!actual || actual.sha256 !== attachment.file.sha256)
      throw new AttachmentError(
        'El archivo no está disponible. Quita el comprobante y vuelve a seleccionarlo.',
      );
    if (!(await isAvailableAsync()))
      throw new AttachmentError('No hay aplicaciones disponibles para compartir este archivo.');
    await shareAsync(this.uri(attachment.id), {
      mimeType: attachment.file.mimeType,
      dialogTitle: 'Compartir comprobante',
    });
  }
}
