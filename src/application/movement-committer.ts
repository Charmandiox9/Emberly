import { recordMovement, SqliteFinanceRepository, type Movement } from '../modules/movements';
import {
  SqliteAttachmentRepository,
  type Attachment,
  type AttachmentIdentity,
  type AttachmentSource,
} from '../modules/attachments';
import { createAttachmentDraft } from '../modules/attachments';
import type { Database } from '../shared/storage/database';

export interface MovementCommitInput {
  readonly movement: Movement;
  readonly today: string;
  readonly updating: boolean;
  readonly selected: readonly AttachmentSource[];
}

export interface MovementCommitter {
  commit(input: MovementCommitInput): Promise<readonly Attachment[]>;
}

export class SqliteMovementCommitter implements MovementCommitter {
  constructor(
    private readonly database: Database,
    private readonly identity: AttachmentIdentity,
  ) {}

  async commit(input: MovementCommitInput): Promise<readonly Attachment[]> {
    const drafts = input.selected.map((source) =>
      createAttachmentDraft(this.identity.nextId(), input.movement.id, source, this.identity.now()),
    );
    await this.database.transaction(async (transaction) => {
      // Repositories share this transaction; they must not open nested connections/commits.
      const scoped: Database = { ...transaction, transaction: (work) => work(transaction) };
      await recordMovement(
        new SqliteFinanceRepository(scoped),
        input.movement,
        input.today,
        input.updating,
      );
      const proofs = new SqliteAttachmentRepository(scoped);
      for (const draft of drafts) await proofs.prepare(draft);
    });
    return drafts;
  }
}
