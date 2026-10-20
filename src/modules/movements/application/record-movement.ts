import { createBusinessDate } from '../../../shared/domain/business-date';
import { createMovement, type Movement } from '../domain/movement';
import type { FinanceRepository } from './finance-repository';

export async function recordMovement(
  repository: FinanceRepository,
  input: Movement,
  today: string,
  editing = false,
): Promise<Movement> {
  const movement = createMovement(input);
  createBusinessDate(today);
  if (movement.date > today) throw new Error('La fecha no puede estar en el futuro.');
  if (editing) await repository.update(movement);
  else await repository.save(movement);
  return movement;
}
