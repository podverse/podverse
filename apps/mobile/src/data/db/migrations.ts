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
  {
    version: 12,
    statements: [
      // Directory listen-count ranks for Home's popularity order. Stored beside the follow so the
      // subscribed list can keep that order with no connection.
      `ALTER TABLE subscribed_channel ADD COLUMN popularity_rank INTEGER;`,
      `ALTER TABLE channel_item ADD COLUMN popularity_rank INTEGER;`,
    ],
  },
  {
    version: 13,
    statements: [
      // Channel identity on the download row so the monitor list and Home's unsubscribed footer
      // still name the show after the user unsubscribes. dismissed_from_list hides completes from
      // the monitor without deleting the file (offline play and storage counts still use the row).
      `ALTER TABLE download ADD COLUMN channel_id_text TEXT;`,
      `ALTER TABLE download ADD COLUMN channel_title TEXT;`,
      `ALTER TABLE download ADD COLUMN dismissed_from_list INTEGER NOT NULL DEFAULT 0;`,
      `CREATE INDEX IF NOT EXISTS idx_download_channel_id ON download (channel_id_text);`,
    ],
  },
  {
    version: 14,
    statements: [
      // Home chips split follows by channel kind (podcasts vs artists vs albums). Existing rows
      // default to podcasts; the next subscribe or directory sync stamps the real kind from
      // medium_id / add-by-RSS resourceType.
      `ALTER TABLE subscribed_channel ADD COLUMN kind TEXT NOT NULL DEFAULT 'podcasts';`,
      `CREATE INDEX IF NOT EXISTS idx_subscribed_channel_kind ON subscribed_channel (kind);`,
    ],
  },
  {
    version: 15,
    statements: [
      // Evidence-chip visibility for a channel or item, keyed as channel:<id> / item:<id>.
      `CREATE TABLE section_chrome_flags (
        cache_key TEXT PRIMARY KEY NOT NULL,
        flags_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );`,
    ],
  },
  {
    version: 16,
    statements: [
      // Durable playback mutations that can be replayed in occurred-at order after reconnect.
      `CREATE TABLE IF NOT EXISTS playback_outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL,
        account_id_text TEXT NOT NULL,
        queue_id_text TEXT NOT NULL,
        resource_kind TEXT NOT NULL,
        resource_id_text TEXT NOT NULL,
        event_kind TEXT NOT NULL,
        occurred_at INTEGER NOT NULL,
        playback_position REAL,
        media_file_duration REAL,
        completed INTEGER,
        payload_json TEXT
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_playback_outbox_event_id
        ON playback_outbox (event_id);`,
      `CREATE INDEX IF NOT EXISTS idx_playback_outbox_account_id
        ON playback_outbox (account_id_text, id);`,
      // Signed-in local playback state, independent from pending outbox rows.
      `CREATE TABLE IF NOT EXISTS playback_local_state (
        account_id_text TEXT NOT NULL,
        queue_id_text TEXT NOT NULL,
        resource_kind TEXT NOT NULL,
        resource_id_text TEXT NOT NULL,
        playback_position REAL NOT NULL,
        media_file_duration REAL,
        completed INTEGER NOT NULL DEFAULT 0,
        zone TEXT NOT NULL,
        last_meaningful_at INTEGER NOT NULL,
        PRIMARY KEY (account_id_text, queue_id_text, resource_kind, resource_id_text)
      );`,
      `CREATE INDEX IF NOT EXISTS idx_playback_local_state_account_queue
        ON playback_local_state (account_id_text, queue_id_text);`,
    ],
  },
];

export const LATEST_MIGRATION_VERSION: number = MIGRATIONS.reduce(
  (max, migration) => (migration.version > max ? migration.version : max),
  0
);
