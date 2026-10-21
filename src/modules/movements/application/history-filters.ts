import { monthRange, type MovementKind } from '../domain/movement';

export interface HistoryFilterInput {
  readonly month?: unknown;
  readonly kind?: unknown;
  readonly categoryId?: unknown;
}
export interface HistoryFilters {
  readonly month?: string;
  readonly kind?: MovementKind;
  readonly categoryId?: string;
}
export function historyFilters(input: HistoryFilterInput): HistoryFilters {
  let month: string | undefined;
  if (typeof input.month === 'string') {
    try {
      monthRange(input.month);
      month = input.month;
    } catch {
      /* Use the default period. */
    }
  }
  const kind = input.kind === 'income' || input.kind === 'expense' ? input.kind : undefined;
  const categoryId =
    typeof input.categoryId === 'string' &&
    input.categoryId.trim() &&
    input.categoryId.length <= 128
      ? input.categoryId
      : undefined;
  return {
    ...(month ? { month } : {}),
    ...(kind ? { kind } : {}),
    ...(categoryId ? { categoryId } : {}),
  };
}
