import {
  createAttachmentDraft,
  type Attachment,
  type AttachmentSource,
} from '../domain/attachment';
import type { AttachmentFiles, AttachmentIdentity, AttachmentRepository } from './ports';

export class AttachmentService {
  private pending: Promise<void> = Promise.resolve();

  constructor(
    private readonly repository: AttachmentRepository,
    private readonly files: AttachmentFiles,
    private readonly identity: AttachmentIdentity,
  ) {}

  private serial<T>(work: () => Promise<T>): Promise<T> {
    const result = this.pending.then(work);
    this.pending = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  list(movementId: string): Promise<readonly Attachment[]> {
    return this.repository.list(movementId);
  }

  add(movementId: string, source: AttachmentSource): Promise<void> {
    return this.serial(async () => {
      const id = this.identity.nextId();
      await this.repository.prepare(
        createAttachmentDraft(id, movementId, source, this.identity.now()),
      );
      await this.copy(id, source.uri);
    });
  }

  private async copy(id: string, uri: string): Promise<void> {
    try {
      const existing = await this.files.inspect(id);
      await this.repository.complete(id, existing ?? (await this.files.copy(uri, id)));
    } catch (error: unknown) {
      await this.repository.fail(id);
      throw error;
    }
  }

  retry(attachment: Attachment): Promise<void> {
    return this.serial(async () => {
      if (attachment.state === 'ready') return;
      if (!attachment.sourceUri) throw new Error('Vuelve a seleccionar el comprobante.');
      await this.copy(attachment.id, attachment.sourceUri);
    });
  }

  remove(id: string): Promise<void> {
    return this.serial(async () => {
      await this.repository.remove(id);
      await this.cleanup();
    });
  }

  uri(id: string): string {
    return this.files.uri(id);
  }

  share(attachment: Attachment): Promise<void> {
    return this.files.share(attachment);
  }

  private async cleanup(): Promise<void> {
    for (const id of await this.repository.cleanupIds()) {
      try {
        await this.files.remove(id);
        await this.repository.cleaned(id);
      } catch {
        // Keep the durable cleanup job for the next startup or removal.
      }
    }
  }

  recover(): Promise<void> {
    return this.serial(async () => {
      for (const attachment of await this.repository.incomplete()) {
        try {
          const complete = await this.files.inspect(attachment.id);
          if (complete) await this.repository.complete(attachment.id, complete);
          else await this.repository.fail(attachment.id);
        } catch {
          await this.repository.fail(attachment.id);
        }
      }
      await this.cleanup();
    });
  }
}
