import { describe, expect, it } from 'vitest';
import { createTransfer, type TransferInput } from '../../src/modules/transfers';
import { createMoney } from '../../src/shared/domain/money';

const input: TransferInput = {
  id: 'transfer',
  sourceAccountId: 'a',
  destinationAccountId: 'b',
  amount: createMoney(1000),
  description: ' Ahorro ',
  date: '2026-10-20',
  createdAt: '2026-10-20T12:00:00.000Z',
};
describe('reglas de transferencias', () => {
  it('normaliza concepto y comienza activa', () => {
    expect(createTransfer(input).description).toBe('Ahorro');
    expect(createTransfer(input).reversedAt).toBeNull();
  });
  it('rechaza cuentas iguales, monto no positivo y fecha o auditoría inválidas', () => {
    for (const candidate of [
      { ...input, destinationAccountId: 'a' },
      { ...input, amount: createMoney(0) },
      { ...input, amount: createMoney(-1) },
      { ...input, date: '2026-02-30' },
      { ...input, createdAt: 'invalid' },
      { ...input, description: ' ' },
    ])
      expect(() => createTransfer(candidate)).toThrow();
  });
});
