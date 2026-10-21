export const goalImagesMigrationSql = `
  CREATE TABLE goal_images (
    goal_id TEXT PRIMARY KEY NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    image_id TEXT NOT NULL UNIQUE CHECK (length(image_id) = 36),
    mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    size_bytes INTEGER NOT NULL CHECK (typeof(size_bytes) = 'integer' AND size_bytes BETWEEN 1 AND 10485760),
    sha256 TEXT NOT NULL CHECK (length(sha256) = 64)
  );
`;
