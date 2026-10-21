import { describe, expect, it } from 'vitest';
import {
  attachmentName,
  attachmentSizeLimit,
  detectAttachmentMime,
  validateAttachmentId,
} from '../../src/modules/attachments/domain/attachment';

describe('validación de comprobantes', () => {
  it('reconoce PDF, JPEG, PNG y WebP por su cabecera, no por el nombre', () => {
    expect(detectAttachmentMime(new TextEncoder().encode('%PDF-1.7'))).toBe('application/pdf');
    expect(detectAttachmentMime(new Uint8Array([255, 216, 255, 0]))).toBe('image/jpeg');
    expect(detectAttachmentMime(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(
      'image/png',
    );
    expect(detectAttachmentMime(new TextEncoder().encode('RIFFxxxxWEBPdata'))).toBe('image/webp');
  });
  it('rechaza archivos vacíos, desconocidos, cabeceras incompletas y tamaños excesivos', () => {
    for (const bytes of [
      new Uint8Array(),
      new Uint8Array([255, 216]),
      new TextEncoder().encode('HTML'),
      new Uint8Array(attachmentSizeLimit + 1),
    ])
      expect(() => detectAttachmentMime(bytes)).toThrow();
  });
  it('normaliza nombres visibles y evita que identificadores formen rutas arbitrarias', () => {
    expect(attachmentName('../foto\u0000.pdf')).toBe('.._foto_.pdf');
    expect(attachmentName(' ')).toBe('Comprobante');
    expect(attachmentName('a'.repeat(200))).toHaveLength(120);
    expect(() => validateAttachmentId('../other')).toThrow();
    expect(() => validateAttachmentId('00000000-0000-4000-8000-000000000001')).not.toThrow();
  });
});
