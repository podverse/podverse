/**
 * Forward-only SQLite migrations for the offline-first data layer.
 *
 * Rules (see mobile-data-layer skill + DOCS-MOBILE-DATA-LAYER-OFFLINE.md):
 * - Append new migrations with a strictly increasing integer `version`; never edit or reorder
 *   a migration that has shipped.
 * - `version` is applied via `PRAGMA user_version` (see runMigrations); values MUST be integer
 *   literals authored here, never user input.
 * - Domain tables (account, queue, add-by-rss) arrive in later Track 9b steps as new migrations.
 */
export type Migration = {
  version: number;
  statements: string[];
};

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS kv_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT,
        updated_at INTEGER
      );`,
    ],
  },
  {
    version: 2,
    statements: [
      `CREATE TABLE IF NOT EXISTS account_snapshot (
        id TEXT PRIMARY KEY NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );`,
    ],
  },
  {
    version: 3,
    statements: [
      `CREATE TABLE IF NOT EXISTS queue_cache (
        cache_key TEXT PRIMARY KEY NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );`,
    ],
  },
  {
    version: 4,
    statements: [
      `CREATE TABLE IF NOT EXISTS add_by_rss_feed (
        feed_url TEXT PRIMARY KEY NOT NULL,
        id INTEGER NOT NULL,
        id_text TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        title TEXT,
        image_url TEXT,
        enclosure_url TEXT,
        playback_position TEXT,
        mapped_feed_json TEXT,
        updated_at TEXT NOT NULL
      );`,
    ],
  },
  {
    version: 5,
    statements: [
      `CREATE TABLE IF NOT EXISTS download (
        item_id_text TEXT PRIMARY KEY NOT NULL,
        enclosure_uri TEXT NOT NULL,
        enclosure_url_hash TEXT NOT NULL,
        enclosure_mime TEXT,
        media_type TEXT NOT NULL,
        file_extension TEXT,
        file_path TEXT,
        byte_size INTEGER,
        bytes_downloaded INTEGER NOT NULL,
        status TEXT NOT NULL,
        title TEXT,
        artwork_url TEXT,
        error_reason TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_download_status ON download (status);`,
    ],
  },
];

export const LATEST_MIGRATION_VERSION: number = MIGRATIONS.reduce(
  (max, migration) => (migration.version > max ? migration.version : max),
  0
);
