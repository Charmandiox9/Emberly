const recordEvents = ['movements', 'transfers'] as const;
const planningEvents = ['budgets', 'goals', 'goal_allocations'] as const;

function activityTriggers(tables: readonly string[], activityType: 'record' | 'planning'): string {
  return tables
    .map(
      (table) => `
    CREATE TRIGGER ember_activity_${table}_insert AFTER INSERT ON ${table}
    BEGIN
      INSERT OR IGNORE INTO ember_activity_days (activity_date, activity_type, first_recorded_at)
      VALUES (substr(NEW.created_at, 1, 10), '${activityType}', NEW.created_at);
    END;
  `,
    )
    .join('\n');
}

export const emberProgressMigrationSql = `
  CREATE TABLE ember_activity_days (
    activity_date TEXT NOT NULL CHECK (
      activity_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
      AND date(activity_date) = activity_date
    ),
    activity_type TEXT NOT NULL CHECK (activity_type IN ('record', 'planning', 'review')),
    first_recorded_at TEXT NOT NULL CHECK (
      length(first_recorded_at) = 24 AND first_recorded_at GLOB
      '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
    ),
    PRIMARY KEY (activity_date, activity_type)
  );
  CREATE TABLE ember_achievements (
    achievement_id TEXT PRIMARY KEY NOT NULL CHECK (achievement_id IN (
      'first-record', 'first-plan', 'first-review', 'three-active-days', 'ten-active-days'
    )),
    earned_at TEXT NOT NULL CHECK (
      length(earned_at) = 24 AND earned_at GLOB
      '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'
    )
  );

  INSERT OR IGNORE INTO ember_activity_days (activity_date, activity_type, first_recorded_at)
  SELECT substr(created_at, 1, 10), 'record', MIN(created_at) FROM movements GROUP BY substr(created_at, 1, 10);
  INSERT OR IGNORE INTO ember_activity_days (activity_date, activity_type, first_recorded_at)
  SELECT substr(created_at, 1, 10), 'record', MIN(created_at) FROM transfers GROUP BY substr(created_at, 1, 10);
  INSERT OR IGNORE INTO ember_activity_days (activity_date, activity_type, first_recorded_at)
  SELECT substr(created_at, 1, 10), 'planning', MIN(created_at) FROM budgets GROUP BY substr(created_at, 1, 10);
  INSERT OR IGNORE INTO ember_activity_days (activity_date, activity_type, first_recorded_at)
  SELECT substr(created_at, 1, 10), 'planning', MIN(created_at) FROM goals GROUP BY substr(created_at, 1, 10);
  INSERT OR IGNORE INTO ember_activity_days (activity_date, activity_type, first_recorded_at)
  SELECT substr(created_at, 1, 10), 'planning', MIN(created_at) FROM goal_allocations GROUP BY substr(created_at, 1, 10);

  INSERT OR IGNORE INTO ember_achievements (achievement_id, earned_at)
  SELECT 'first-record', MIN(first_recorded_at) FROM ember_activity_days WHERE activity_type = 'record'
  HAVING COUNT(*) > 0;
  INSERT OR IGNORE INTO ember_achievements (achievement_id, earned_at)
  SELECT 'first-plan', MIN(first_recorded_at) FROM ember_activity_days WHERE activity_type = 'planning'
  HAVING COUNT(*) > 0;
  INSERT OR IGNORE INTO ember_achievements (achievement_id, earned_at)
  SELECT 'first-review', MIN(first_recorded_at) FROM ember_activity_days WHERE activity_type = 'review'
  HAVING COUNT(*) > 0;
  INSERT OR IGNORE INTO ember_achievements (achievement_id, earned_at)
  SELECT 'three-active-days', MAX(first_recorded_at) FROM ember_activity_days
  HAVING COUNT(DISTINCT activity_date) >= 3;
  INSERT OR IGNORE INTO ember_achievements (achievement_id, earned_at)
  SELECT 'ten-active-days', MAX(first_recorded_at) FROM ember_activity_days
  HAVING COUNT(DISTINCT activity_date) >= 10;

  CREATE TRIGGER ember_awards_after_activity AFTER INSERT ON ember_activity_days
  BEGIN
    INSERT OR IGNORE INTO ember_achievements (achievement_id, earned_at)
    SELECT 'first-record', NEW.first_recorded_at WHERE NEW.activity_type = 'record';
    INSERT OR IGNORE INTO ember_achievements (achievement_id, earned_at)
    SELECT 'first-plan', NEW.first_recorded_at WHERE NEW.activity_type = 'planning';
    INSERT OR IGNORE INTO ember_achievements (achievement_id, earned_at)
    SELECT 'first-review', NEW.first_recorded_at WHERE NEW.activity_type = 'review';
    INSERT OR IGNORE INTO ember_achievements (achievement_id, earned_at)
    SELECT 'three-active-days', NEW.first_recorded_at
    WHERE (SELECT COUNT(DISTINCT activity_date) FROM ember_activity_days) >= 3;
    INSERT OR IGNORE INTO ember_achievements (achievement_id, earned_at)
    SELECT 'ten-active-days', NEW.first_recorded_at
    WHERE (SELECT COUNT(DISTINCT activity_date) FROM ember_activity_days) >= 10;
  END;
  ${activityTriggers(recordEvents, 'record')}
  ${activityTriggers(planningEvents, 'planning')}
`;
