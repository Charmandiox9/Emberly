import type { Money } from '../../../shared/domain/money';
import type { Category, Movement, MovementKind } from '../domain/movement';

export interface MovementCursor {
  readonly date: string;
  readonly id: string;
}

export interface MovementQuery {
  readonly month: string;
  readonly kind?: MovementKind;
  readonly accountId?: string;
  readonly categoryId?: string;
  readonly cursor?: MovementCursor;
  readonly limit?: number;
}

export interface MovementEntry extends Movement {
  readonly accountName: string;
  readonly categoryName: string;
}

export interface MovementPage {
  readonly entries: readonly MovementEntry[];
  readonly nextCursor: MovementCursor | null;
}

export interface AccountBalance {
  readonly id: string;
  readonly name: string;
  readonly balance: Money;
  readonly archived: boolean;
}

export interface CategoryTotal {
  readonly id: string;
  readonly name: string;
  readonly total: Money;
}

export interface Overview {
  readonly month: string;
  readonly balance: Money;
  readonly income: Money;
  readonly expenses: Money;
  readonly accounts: readonly AccountBalance[];
  readonly expenseCategories: readonly CategoryTotal[];
}

export interface FinanceRepository {
  categories(): Promise<readonly Category[]>;
  list(query: MovementQuery): Promise<MovementPage>;
  get(id: string): Promise<MovementEntry | null>;
  save(movement: Movement): Promise<void>;
  update(movement: Movement): Promise<void>;
  remove(id: string): Promise<void>;
  overview(month: string): Promise<Overview>;
}
