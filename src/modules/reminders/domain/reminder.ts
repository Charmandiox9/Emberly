export interface ReminderTime {
  readonly hour: number;
  readonly minute: number;
}
export interface ReminderPreferences extends ReminderTime {
  readonly enabled: boolean;
}
export interface ReminderSettings extends ReminderPreferences {
  readonly revision: number;
}
export const reminderPrefix = 'emberly.reminder.daily-review.';
export const reminderId = `${reminderPrefix}v1`;
export const reminderTitle = 'Un momento para ti';
export const reminderBody = 'Puedes abrir Emberly y revisar tu día cuando te venga bien.';

export class ReminderBuildRequiredError extends Error {
  constructor() {
    super('development-build-required');
    this.name = 'ReminderBuildRequiredError';
  }
}

export function reminderPreferences(input: ReminderPreferences): ReminderPreferences {
  if (
    typeof input.enabled !== 'boolean' ||
    !Number.isInteger(input.hour) ||
    input.hour < 0 ||
    input.hour > 23 ||
    !Number.isInteger(input.minute) ||
    input.minute < 0 ||
    input.minute > 59
  )
    throw new Error('Configura una hora válida entre 00:00 y 23:59.');
  return Object.freeze({ enabled: input.enabled, hour: input.hour, minute: input.minute });
}
export function parseReminderTime(value: string): ReminderTime {
  if (!/^\d{2}:\d{2}$/.test(value)) throw new Error('Usa el formato HH:MM, por ejemplo 20:00.');
  const preferences = reminderPreferences({
    enabled: false,
    hour: Number(value.slice(0, 2)),
    minute: Number(value.slice(3)),
  });
  return { hour: preferences.hour, minute: preferences.minute };
}
export function formatReminderTime(time: ReminderTime): string {
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}
