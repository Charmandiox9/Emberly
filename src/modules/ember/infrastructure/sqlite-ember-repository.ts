import type { Database } from '../../../shared/storage/database';
import {
  createEmberProgress,
  emberAchievements,
  type EmberAchievementId,
  type EarnedEmberAchievement,
  type EmberProgress,
} from '../domain/ember-progress';
import type { EmberRepository } from '../application/ember-repository';

function isAchievementId(value: string): value is EmberAchievementId {
  return emberAchievements.some((achievement) => achievement.id === value);
}

function readAchievementId(value: unknown): EmberAchievementId {
  if (typeof value !== 'string' || !isAchievementId(value))
    throw new Error('Se encontró un logro de Ember no válido.');
  return value;
}

function readTimestamp(value: unknown): string {
  if (typeof value !== 'string') throw new Error('La fecha de un logro de Ember no es válida.');
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime()) || instant.toISOString() !== value)
    throw new Error('La fecha de un logro de Ember no es válida.');
  return value;
}

export class SqliteEmberRepository implements EmberRepository {
  constructor(private readonly database: Database) {}

  async readProgress(): Promise<EmberProgress> {
    const [daysRow, achievementRows] = await Promise.all([
      this.database.first(
        'SELECT COUNT(DISTINCT activity_date) AS active_days FROM ember_activity_days',
      ),
      this.database.all(
        `SELECT achievement_id, earned_at FROM ember_achievements
          ORDER BY earned_at, CASE achievement_id
            WHEN 'first-record' THEN 0 WHEN 'first-plan' THEN 1
            WHEN 'first-review' THEN 2 WHEN 'three-active-days' THEN 3 ELSE 4 END`,
      ),
    ]);
    const activeDays = daysRow?.['active_days'];
    if (typeof activeDays !== 'number' || !Number.isSafeInteger(activeDays) || activeDays < 0)
      throw new Error('No se pudo leer el progreso de Ember.');
    const achievements = achievementRows.map((row): EarnedEmberAchievement => ({
      id: readAchievementId(row['achievement_id']),
      earnedAt: readTimestamp(row['earned_at']),
    }));
    return createEmberProgress(activeDays, achievements);
  }

  async recordReview(recordedAt: string): Promise<void> {
    const instant = new Date(recordedAt);
    if (!Number.isFinite(instant.getTime()) || instant.toISOString() !== recordedAt)
      throw new Error('La fecha de revisión de Ember no es válida.');
    await this.database.run(
      `INSERT OR IGNORE INTO ember_activity_days (activity_date, activity_type, first_recorded_at)
        VALUES (substr(?, 1, 10), 'review', ?)`,
      [recordedAt, recordedAt],
    );
  }
}
