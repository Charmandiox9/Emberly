export { createGoal, goalChanges, createAllocation } from './domain/goal';
export type { Goal, GoalChanges, GoalAllocation, AllocationKind } from './domain/goal';
export type {
  GoalEntry,
  GoalFunding,
  GoalsOverview,
  GoalRepository,
  AllocationCursor,
  AllocationQuery,
  AllocationPage,
} from './application/goal-repository';
export { SqliteGoalRepository } from './infrastructure/sqlite-goal-repository';
