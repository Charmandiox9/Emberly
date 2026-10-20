import { describe, expect, it } from 'vitest';

import {
  addMoney,
  createMoney,
  formatMoney,
  parseMoney,
  sumMoney,
} from '../../src/shared/domain/money';

describe('dinero CLP', () => {
  it.each([
    ['25000', 25000],
    ['25.000', 25000],
    [' -1.500 ', -1500],
    ['0', 0],
    ['-0', 0],
    ['9.007.199.254.740.991', Number.MAX_SAFE_INTEGER],
  ])('interpreta %s sin decimales ni redondeos', (input, expected) => {
    expect(parseMoney(input)).toEqual({ amountMinor: expected, currency: 'CLP' });
  });

  it.each(['', ' ', '1,50', '1.50', '1e3', '1.000,00', '01', 'NaN', '9.007.199.254.740.992'])(
    'rechaza una entrada ambigua o fuera de rango: %s',
    (input) => expect(() => parseMoney(input)).toThrow(),
  );

  it.each([NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1])(
    'rechaza montos no enteros seguros: %s',
    (amount) => expect(() => createMoney(amount)).toThrow(),
  );

  it('suma exactamente ingresos y saldos negativos', () => {
    expect(addMoney(createMoney(10000), createMoney(-2500)).amountMinor).toBe(7500);
  });

  it('rechaza desbordamiento positivo y negativo', () => {
    expect(() => addMoney(createMoney(Number.MAX_SAFE_INTEGER), createMoney(1))).toThrow();
    expect(() => addMoney(createMoney(Number.MIN_SAFE_INTEGER), createMoney(-1))).toThrow();
  });

  it('mantiene inmutable el valor y formatea CLP sin centavos', () => {
    expect(Object.isFrozen(createMoney(12000))).toBe(true);
    expect(formatMoney(createMoney(12000))).toContain('12.000');
  });

  it('suma múltiples cuentas sin depender del orden de sus saldos', () => {
    const maximum = createMoney(Number.MAX_SAFE_INTEGER);
    const minimum = createMoney(-Number.MAX_SAFE_INTEGER);
    expect(sumMoney([maximum, maximum, minimum])).toEqual(maximum);
    expect(sumMoney([minimum, maximum, maximum])).toEqual(maximum);
  });

  it('rechaza un agregado cuyo resultado final excede el rango seguro', () => {
    expect(() => sumMoney([createMoney(Number.MAX_SAFE_INTEGER), createMoney(1)])).toThrow();
  });
});
