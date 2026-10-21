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
