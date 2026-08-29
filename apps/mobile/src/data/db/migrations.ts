/**
 * Forward-only SQLite migrations for the offline-first data layer.
 *
 * Rules (see mobile-data-layer skill + DOCS-MOBILE-DATA-LAYER-OFFLINE.md):
 * - Append new migrations with a strictly increasing integer `version`; never edit or reorder
 *   a migration that has shipped.
 * - `version` is applied via `PRAGMA user_version` (see runMigrations); values MUST be integer
 *   literals authored here, never user input.
 * - Domain tables use new migrations appended after the existing versions.
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
  {
    version: 6,
    statements: [
      `CREATE TABLE IF NOT EXISTS subscribed_channel (
        id_text TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        image_url TEXT,
        source TEXT NOT NULL,
        medium TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );`,
    ],
  },
  {
    version: 7,
    statements: [
      `CREATE TABLE IF NOT EXISTS sync_event_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        occurred_at INTEGER NOT NULL,
        job_kind TEXT NOT NULL,
        outcome TEXT NOT NULL,
        error_code TEXT,
        message TEXT
      );`,
      `CREATE INDEX IF NOT EXISTS idx_sync_event_log_occurred_at ON sync_event_log (occurred_at);`,
    ],
  },
  {
    version: 8,
    statements: [
      `CREATE TABLE IF NOT EXISTS channel_item (
        item_id_text TEXT PRIMARY KEY NOT NULL,
        channel_id_text TEXT NOT NULL,
        title TEXT,
        image_url TEXT,
        pub_date_ms INTEGER,
        payload_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_channel_item_channel_pub_date
        ON channel_item (channel_id_text, pub_date_ms DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_channel_item_pub_date ON channel_item (pub_date_ms DESC);`,
      `CREATE TABLE IF NOT EXISTS channel_item_window (
        channel_id_text TEXT PRIMARY KEY NOT NULL,
        depth INTEGER NOT NULL,
        synced_at INTEGER
      );`,
    ],
  },
  {
    version: 9,
    statements: [
      `CREATE TABLE IF NOT EXISTS channel_seen (
        subscription_key TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL,
        last_seen_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );`,
    ],
  },
  {
    version: 10,
    statements: [
      // Directory channels answer "when did this last publish" from `channel_item`. An add-by-RSS
      // feed is one JSON bundle, so without this column the same question would mean deserializing
      // every followed feed on the JS thread each time the list is ordered by recency.
      `ALTER TABLE add_by_rss_feed ADD COLUMN latest_item_pub_date_ms INTEGER;`,
    ],
  },
  {
    version: 11,
    statements: [
      // Live items are excluded from every regular item query, so `channel_item` can never answer
      // "is this channel broadcasting" and the row would have to ask the network to draw itself.
      `CREATE TABLE IF NOT EXISTS channel_live_status (
        subscription_key TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL,
        status_id INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );`,
    ],
  },
];

export const LATEST_MIGRATION_VERSION: number = MIGRATIONS.reduce(
  (max, migration) => (migration.version > max ? migration.version : max),
  0
);
