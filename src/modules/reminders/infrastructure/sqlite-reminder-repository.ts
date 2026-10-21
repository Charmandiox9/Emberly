import type { Database, DatabaseRow } from '../../../shared/storage/database';
import {
  reminderPreferences,
  type ReminderPreferences,
  type ReminderSettings,
} from '../domain/reminder';
import type { ReminderRepository } from '../application/ports';

function settings(row: DatabaseRow | null): ReminderSettings {
  if (
    !row ||
    (row['enabled'] !== 0 && row['enabled'] !== 1) ||
    typeof row['hour'] !== 'number' ||
    typeof row['minute'] !== 'number' ||
    typeof row['revision'] !== 'number' ||
    !Number.isSafeInteger(row['revision']) ||
    row['revision'] < 1
  )
    throw new Error('Preferencias inválidas.');
  return {
    ...reminderPreferences({
      enabled: row['enabled'] === 1,
      hour: row['hour'],
      minute: row['minute'],
    }),
    revision: row['revision'],
  };
}
export class SqliteReminderRepository implements ReminderRepository {
  constructor(private readonly database: Database) {}
  async read(): Promise<ReminderSettings> {
    return settings(await this.database.first('SELECT * FROM reminder_settings WHERE id = 1'));
  }
  async save(input: ReminderPreferences): Promise<ReminderSettings> {
    const preferences = reminderPreferences(input);
    let result: ReminderSettings | undefined;
    await this.database.transaction(async (transaction) => {
      await transaction.run(
        `UPDATE reminder_settings SET enabled = ?, hour = ?, minute = ?, revision = revision + 1
        WHERE id = 1 AND (enabled <> ? OR hour <> ? OR minute <> ?)`,
        [
          preferences.enabled ? 1 : 0,
          preferences.hour,
          preferences.minute,
          preferences.enabled ? 1 : 0,
          preferences.hour,
          preferences.minute,
        ],
      );
      result = settings(await transaction.first('SELECT * FROM reminder_settings WHERE id = 1'));
    });
    if (!result) throw new Error('No se guardaron las preferencias.');
    return result;
  }
}
