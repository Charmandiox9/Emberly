import { describe, expect, it } from 'vitest';

import { businessDateAt, createBusinessDate } from '../../src/shared/domain/business-date';

describe('fechas de negocio', () => {
  it.each(['2024-02-29', '2000-02-29', '2026-10-20'])('acepta %s', (value) => {
    expect(createBusinessDate(value).value).toBe(value);
  });

  it.each(['2026-02-29', '1900-02-29', '2026-04-31', '2026-13-01', '0000-01-01', '2026-1-1'])(
    'rechaza una fecha inexistente o mal formada: %s',
    (value) => expect(() => createBusinessDate(value)).toThrow(),
  );

  it('asigna al mes anterior un instante UTC que en Santiago aún es marzo', () => {
    expect(businessDateAt(new Date('2026-04-01T01:00:00Z'), 'America/Santiago').value).toBe(
      '2026-03-31',
    );
  });

  it('usa el offset de invierno y verano de la zona, sin fijarlo manualmente', () => {
    expect(businessDateAt(new Date('2026-07-01T03:30:00Z'), 'America/Santiago').value).toBe(
      '2026-06-30',
    );
    expect(businessDateAt(new Date('2026-01-01T03:30:00Z'), 'America/Santiago').value).toBe(
      '2026-01-01',
    );
  });

  it('rechaza instantes y zonas inválidos', () => {
    expect(() => businessDateAt(new Date('invalid'), 'America/Santiago')).toThrow();
    expect(() => businessDateAt(new Date(), 'Invalid/Zone')).toThrow();
  });
});
