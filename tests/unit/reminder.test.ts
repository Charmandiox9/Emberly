import { describe, expect, it } from 'vitest';
import {
  formatReminderTime,
  parseReminderTime,
  reminderPreferences,
} from '../../src/modules/reminders';

describe('horarios de recordatorios', () => {
  it('admite horas límite y formato de 24 horas', () => {
    expect(parseReminderTime('00:00')).toEqual({ hour: 0, minute: 0 });
    expect(parseReminderTime('23:59')).toEqual({ hour: 23, minute: 59 });
    expect(formatReminderTime({ hour: 8, minute: 5 })).toBe('08:05');
    expect(reminderPreferences({ enabled: false, hour: 20, minute: 0 }).enabled).toBe(false);
  });
  it('rechaza horas inexistentes, parciales, fraccionarias y ambiguas', () => {
    for (const value of ['24:00', '20:60', '8:00', '08:5', '20.00', '', ' 20:00', '20:00:00'])
      expect(() => parseReminderTime(value)).toThrow();
    for (const hour of [NaN, -1, 24, 1.5])
      expect(() => reminderPreferences({ enabled: true, hour, minute: 0 })).toThrow();
  });
});
