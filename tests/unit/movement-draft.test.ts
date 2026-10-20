import { describe, expect, it } from 'vitest';
import { monthRange, validateMovementDraft, type MovementDraft } from '../../src/modules/movements';

const draft: MovementDraft = {
  accountId: 'cash',
  categoryId: 'food',
  kind: 'expense',
  amount: '25.000',
  description: ' Almuerzo ',
  date: '2026-10-20',
};
const metadata = { id: 'movement-1', today: '2026-10-20', createdAt: '2026-10-20T12:00:00.000Z' };

describe('validación del formulario de movimientos', () => {
  it('convierte el monto y normaliza el concepto antes de guardar', () => {
    const result = validateMovementDraft(draft, metadata);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Se esperaba un borrador válido.');
    expect(result.movement.amount.amountMinor).toBe(25000);
    expect(result.movement.description).toBe('Almuerzo');
  });

  it.each(['0', '-3000', '1,5', '1e3'])(
    'asocia un monto inválido al campo correcto: %s',
    (amount) => {
      const result = validateMovementDraft({ ...draft, amount }, metadata);
      expect(result.success).toBe(false);
      if (result.success) throw new Error('Se esperaba un error de campo.');
      expect(result.errors.amount).toBeTruthy();
      expect(result.errors.date).toBeUndefined();
    },
  );

  it('devuelve todos los errores necesarios sin perder la entrada original', () => {
    const result = validateMovementDraft(
      { ...draft, accountId: '', categoryId: '', description: ' ', date: '2026-02-30' },
      metadata,
    );
    if (result.success) throw new Error('Se esperaban errores de validación.');
    expect(Object.keys(result.errors).sort()).toEqual([
      'accountId',
      'categoryId',
      'date',
      'description',
    ]);
  });

  it('rechaza fechas futuras y permite registros anteriores', () => {
    expect(validateMovementDraft({ ...draft, date: '2026-10-21' }, metadata).success).toBe(false);
    expect(validateMovementDraft({ ...draft, date: '2026-09-30' }, metadata).success).toBe(true);
  });

  it('calcula rangos de diciembre y febrero sin depender de la zona del equipo', () => {
    expect(monthRange('2026-12')).toEqual({ start: '2026-12-01', end: '2027-01-01' });
    expect(monthRange('2024-02')).toEqual({ start: '2024-02-01', end: '2024-03-01' });
  });
});
