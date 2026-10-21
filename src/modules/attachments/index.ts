export { AttachmentService } from './application/attachment-service';
export type {
  AttachmentFiles,
  AttachmentRepository,
  AttachmentPicker,
  AttachmentIdentity,
} from './application/ports';
export type {
  Attachment,
  AttachmentFileInfo,
  AttachmentSource,
  AttachmentOrigin,
  AttachmentMime,
} from './domain/attachment';
export {
  attachmentCountLimit,
  attachmentErrorMessage,
  createAttachmentDraft,
} from './domain/attachment';
export { SqliteAttachmentRepository } from './infrastructure/sqlite-attachment-repository';
