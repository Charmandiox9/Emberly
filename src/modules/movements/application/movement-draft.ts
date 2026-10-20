import { createBusinessDate } from '../../../shared/domain/business-date';
import { parseMoney, type Money } from '../../../shared/domain/money';
import { createMovement, type Movement, type MovementKind } from '../domain/movement';

export interface MovementDraft {
  readonly accountId: string;
  readonly categoryId: string;
  readonly kind: MovementKind;
  readonly amount: string;
  readonly description: string;
  readonly date: string;
}
export interface MovementErrors {
  accountId?: string;
  categoryId?: string;
  amount?: string;
  description?: string;
  date?: string;
  general?: string;
}
interface DraftMetadata {
  readonly id: string;
  readonly createdAt: string;
  readonly today: string;
}
interface ValidDraft {
  readonly success: true;
  readonly movement: Movement;
}
interface InvalidDraft {
  readonly success: false;
  readonly errors: MovementErrors;
}
export type DraftResult = ValidDraft | InvalidDraft;

export function validateMovementDraft(draft: MovementDraft, metadata: DraftMetadata): DraftResult {
  const errors: MovementErrors = {};
  if (!draft.accountId) errors.accountId = 'Selecciona una cuenta.';
  if (!draft.categoryId) errors.categoryId = 'Selecciona una categoría.';
  if (!draft.description.trim() || draft.description.trim().length > 120)
    errors.description = 'Escribe un concepto de entre 1 y 120 caracteres.';
  let amount: Money | undefined;
  try {
    amount = parseMoney(draft.amount);
    if (amount.amountMinor <= 0) errors.amount = 'El monto debe ser mayor que cero.';
  } catch {
    errors.amount = 'Ingresa pesos enteros, por ejemplo 25.000.';
  }
  createBusinessDate(metadata.today);
  try {
    createBusinessDate(draft.date);
    if (draft.date > metadata.today) errors.date = 'La fecha no puede estar en el futuro.';
  } catch {
    errors.date = 'Ingresa una fecha válida con formato AAAA-MM-DD.';
  }
  if (!amount || Object.keys(errors).length > 0) return { success: false, errors };
  return {
    success: true,
    movement: createMovement({ ...draft, amount, id: metadata.id, createdAt: metadata.createdAt }),
  };
}
