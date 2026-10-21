export type SyncEntityType =
  'account' | 'category' | 'movement' | 'transfer' | 'budget' | 'goal' | 'goal_allocation';
export type SyncAction = 'upsert' | 'delete';

// Local snapshots are a storage contract, not an authenticated remote API DTO.
export interface SyncSnapshot {
  readonly [field: string]: string | number;
}

export interface PendingChange {
  readonly sequence: number;
  readonly operationId: string;
  readonly entityType: SyncEntityType;
  readonly entityId: string;
  readonly localRevision: number;
  readonly action: SyncAction;
  readonly payloadVersion: 1;
  readonly snapshot: SyncSnapshot;
}

export interface SyncQueue {
  listPending(limit?: number): Promise<readonly PendingChange[]>;
  countPending(): Promise<number>;
}
