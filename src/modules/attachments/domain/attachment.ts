export const attachmentSizeLimit = 10 * 1024 * 1024;
export const attachmentCountLimit = 5;
export type AttachmentMime = 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';
export type AttachmentState = 'preparing' | 'ready' | 'failed';
export type AttachmentOrigin = 'document' | 'camera' | 'gallery';

export class AttachmentError extends Error {}

export function attachmentErrorMessage(error: unknown): string {
  return error instanceof AttachmentError
    ? error.message
    : 'No pudimos completar la acción del comprobante. Revisa el espacio libre y vuelve a seleccionarlo si su archivo original ya no está disponible.';
}

export interface AttachmentSource {
  readonly uri: string;
  readonly name: string;
}

export interface AttachmentFileInfo {
  readonly sizeBytes: number;
  readonly mimeType: AttachmentMime;
  readonly sha256: string;
}

export interface Attachment {
  readonly id: string;
  readonly movementId: string;
  readonly name: string;
  readonly sourceUri: string | null;
  readonly state: AttachmentState;
  readonly file: AttachmentFileInfo | null;
  readonly createdAt: string;
}

export function createAttachmentDraft(
  id: string,
  movementId: string,
  source: AttachmentSource,
  createdAt: string,
): Attachment {
  validateAttachmentId(id);
  if (!source.uri.startsWith('file://') && !source.uri.startsWith('content://'))
    throw new AttachmentError('Selecciona un archivo del teléfono.');
  return {
    id,
    movementId,
    name: attachmentName(source.name),
    sourceUri: source.uri,
    state: 'preparing',
    file: null,
    createdAt,
  };
}

export function validateAttachmentFileInfo(info: AttachmentFileInfo): void {
  if (
    !Number.isSafeInteger(info.sizeBytes) ||
    info.sizeBytes < 1 ||
    info.sizeBytes > attachmentSizeLimit ||
    !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(info.mimeType) ||
    !/^[a-f0-9]{64}$/.test(info.sha256)
  )
    throw new Error('Archivo guardado inválido.');
}

export function validateAttachmentId(id: string): void {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id))
    throw new Error('Identificador de comprobante inválido.');
}

export function attachmentName(name: string): string {
  return (
    Array.from(name, (character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 || character === '/' || character === '\\' ? '_' : character;
    })
      .join('')
      .trim()
      .slice(0, 120) || 'Comprobante'
  );
}

export function detectAttachmentMime(bytes: Uint8Array): AttachmentMime {
  if (!bytes.length || bytes.length > attachmentSizeLimit)
    throw new AttachmentError('El comprobante debe ocupar entre 1 byte y 10 MB.');
  const starts = (signature: readonly number[]): boolean =>
    signature.every((byte, i) => bytes[i] === byte);
  if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf';
  if (starts([0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (
    starts([0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return 'image/webp';
  throw new AttachmentError('Selecciona un PDF o una imagen JPEG, PNG o WebP.');
}
