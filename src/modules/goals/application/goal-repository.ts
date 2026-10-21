import type { Money } from '../../../shared/domain/money';
import type { Goal, GoalAllocation, GoalChanges } from '../domain/goal';

export interface GoalEntry extends Goal {
  readonly assigned: Money;
  readonly remaining: Money;
  readonly excess: Money;
  readonly complete: boolean;
  readonly percentage: number;
  readonly image: GoalImage | null;
}
export interface GoalImage {
  readonly id: string;
  readonly mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  readonly sizeBytes: number;
  readonly sha256: string;
}
export interface GoalFunding {
  readonly balance: Money;
  readonly assigned: Money;
  readonly available: Money;
  readonly shortfall: Money;
}
export interface GoalsOverview {
  readonly goals: readonly GoalEntry[];
  readonly funding: GoalFunding;
}
export interface AllocationCursor {
  readonly createdAt: string;
  readonly id: string;
}
export interface AllocationQuery {
  readonly goalId: string;
  readonly cursor?: AllocationCursor;
  readonly limit?: number;
}
export interface AllocationPage {
  readonly entries: readonly GoalAllocation[];
  readonly nextCursor: AllocationCursor | null;
}
export interface GoalRepository {
  overview(): Promise<GoalsOverview>;
  save(goal: Goal): Promise<void>;
  update(id: string, changes: GoalChanges): Promise<void>;
  setImage(goalId: string, image: GoalImage | null): Promise<void>;
  allocate(allocation: GoalAllocation): Promise<void>;
  history(query: AllocationQuery): Promise<AllocationPage>;
}
