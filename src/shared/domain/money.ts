export type Currency = 'CLP';

export interface Money {
  readonly amountMinor: number;
  readonly currency: Currency;
}

function assertSafeAmount(amount: number): void {
  if (!Number.isSafeInteger(amount)) {
    throw new Error('El monto debe ser un entero dentro del rango seguro.');
  }
}

export function createMoney(amountMinor: number, currency: Currency = 'CLP'): Money {
  assertSafeAmount(amountMinor);
  if (currency !== 'CLP') {
    throw new Error('Esta versión admite pesos chilenos (CLP).');
  }
  return Object.freeze({ amountMinor: Object.is(amountMinor, -0) ? 0 : amountMinor, currency });
}

export function parseMoney(input: string): Money {
  const normalized = input.trim();
  if (!/^-?(?:0|[1-9]\d*|[1-9]\d{0,2}(?:\.\d{3})+)$/.test(normalized)) {
    throw new Error('Ingresa pesos enteros, por ejemplo 25000 o 25.000.');
  }
  return createMoney(Number(normalized.replaceAll('.', '')));
}

export function addMoney(left: Money, right: Money): Money {
  return sumMoney([left, right]);
}

export function sumMoney(values: readonly Money[]): Money {
  let total = 0n;
  for (const value of values) {
    createMoney(value.amountMinor, value.currency);
    total += BigInt(value.amountMinor);
  }
  if (total > BigInt(Number.MAX_SAFE_INTEGER) || total < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new Error('El resultado supera el rango seguro.');
  }
  return createMoney(Number(total));
}

export function formatMoney(money: Money): string {
  createMoney(money.amountMinor, money.currency);
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: money.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(money.amountMinor);
}
