import type { Attachment, AttachmentService } from '../modules/attachments';
import type { MovementCommitInput, MovementCommitter } from './movement-committer';

interface MovementSaveResult {
  readonly proofStatus: 'saved' | 'incomplete' | 'unavailable';
  readonly attachments: readonly Attachment[];
}
type ProofWriter = Pick<AttachmentService, 'retry' | 'list'>;

export async function saveMovementWithProofs(
  committer: MovementCommitter,
  proofs: ProofWriter,
  input: MovementCommitInput,
): Promise<MovementSaveResult> {
  // Errors before this commit are financial errors. Later failures are attachment results.
  const pending = await committer.commit(input);
  let incomplete = false;
  for (const attachment of pending) {
    try {
      await proofs.retry(attachment);
    } catch {
      incomplete = true;
    }
  }
  try {
    return {
      proofStatus: incomplete ? 'incomplete' : 'saved',
      attachments: await proofs.list(input.movement.id),
    };
  } catch {
    return { proofStatus: 'unavailable', attachments: [] };
  }
}
