import type {
  Attachment,
  AttachmentFileInfo,
  AttachmentOrigin,
  AttachmentSource,
} from '../domain/attachment';

export interface AttachmentRepository {
  list(movementId: string): Promise<readonly Attachment[]>;
  prepare(attachment: Attachment): Promise<void>;
  complete(id: string, info: AttachmentFileInfo): Promise<void>;
  fail(id: string): Promise<void>;
  remove(id: string): Promise<void>;
  incomplete(): Promise<readonly Attachment[]>;
  cleanupIds(): Promise<readonly string[]>;
  cleaned(id: string): Promise<void>;
}

export interface AttachmentFiles {
  copy(sourceUri: string, id: string): Promise<AttachmentFileInfo>;
  inspect(id: string): Promise<AttachmentFileInfo | null>;
  remove(id: string): Promise<void>;
  uri(id: string): string;
  share(attachment: Attachment): Promise<void>;
}

export interface AttachmentPicker {
  select(origin: AttachmentOrigin): Promise<AttachmentSource | null>;
}

export interface AttachmentIdentity {
  nextId(): string;
  now(): string;
}
