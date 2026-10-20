export interface BusinessDate {
  readonly value: string;
}

export function createBusinessDate(value: string): BusinessDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('La fecha debe tener formato AAAA-MM-DD.');
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysPerMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maximumDay = daysPerMonth[month - 1];
  if (year < 1 || maximumDay === undefined || day < 1 || day > maximumDay) {
    throw new Error('La fecha no existe en el calendario.');
  }
  return Object.freeze({ value });
}

export function businessDateAt(instant: Date, timeZone: string): BusinessDate {
  if (!Number.isFinite(instant.getTime())) {
    throw new Error('El instante no es válido.');
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) {
    throw new Error('No se pudo obtener la fecha local.');
  }
  return createBusinessDate(`${year.padStart(4, '0')}-${month}-${day}`);
}
