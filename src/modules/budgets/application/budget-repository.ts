import type { Money } from '../../../shared/domain/money';
import type { Budget, BudgetProgress } from '../domain/budget';

export interface BudgetEntry extends Budget, BudgetProgress {
  readonly categoryName: string;
  readonly categoryArchived: boolean;
}

export interface BudgetRepository {
  list(month: string): Promise<readonly BudgetEntry[]>;
  save(budget: Budget): Promise<void>;
  updateLimit(id: string, limit: Money): Promise<void>;
  remove(id: string): Promise<void>;
}
