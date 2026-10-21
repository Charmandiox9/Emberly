export const remindersMigrationSql = `
  CREATE TABLE reminder_settings (
    id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
    enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
    hour INTEGER NOT NULL CHECK (typeof(hour) = 'integer' AND hour BETWEEN 0 AND 23),
    minute INTEGER NOT NULL CHECK (typeof(minute) = 'integer' AND minute BETWEEN 0 AND 59),
    revision INTEGER NOT NULL CHECK (typeof(revision) = 'integer' AND revision BETWEEN 1 AND 9007199254740991)
  );
  INSERT INTO reminder_settings (id, enabled, hour, minute, revision) VALUES (1, 0, 20, 0, 1);
`;
