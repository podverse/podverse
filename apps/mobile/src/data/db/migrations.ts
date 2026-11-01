/**
 * Forward-only SQLite migrations for the offline-first data layer (see the mobile-data-layer
 * skill).
 *
 * - Append a new migration with the next integer `version`; never edit or reorder a migration
 *   that has shipped.
 * - `runMigrations` writes `version` with `PRAGMA user_version`, so each value MUST be an integer
 *   literal authored here, never user input.
 * - Every schema change also edits `schema.ts` by hand.
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
      `CREATE TABLE IF NOT EXISTS account_snapshot (
        id TEXT PRIMARY KEY NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS queue_cache (
        cache_key TEXT PRIMARY KEY NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );`,
      // latest_item_pub_date_ms: directory channels answer "when did this last publish" from
      // `channel_item`. An Add by RSS feed is one JSON bundle, so without this column ordering the
      // list by recency would mean deserializing every followed feed on the JS thread.
      // requires_credentials / last_auth_failure: whether a feed needs Basic Auth, and the last
      // credential failure a parse reported. The username and password live in SecureStore, never
      // in SQLite.
      // may_have_livestreams: whether the feed has carried a live item in any stored parse. Never
      // cleared, so it outlasts a live item that has left the feed.
      // followed = 0 holds a feed only because an Add by RSS artist on this device lists it. The
      // guid columns let an album name its artist and a listing match a feed under another URL.
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
        updated_at TEXT NOT NULL,
        latest_item_pub_date_ms INTEGER,
        requires_credentials INTEGER NOT NULL DEFAULT 0,
        last_auth_failure TEXT,
        may_have_livestreams INTEGER NOT NULL DEFAULT 0,
        followed INTEGER NOT NULL DEFAULT 1,
        podcast_guid TEXT,
        publisher_guids_json TEXT,
        publisher_directory_json TEXT
      );`,
      `CREATE INDEX IF NOT EXISTS idx_add_by_rss_feed_podcast_guid ON add_by_rss_feed (podcast_guid);`,
      // Channel identity on the download row so the monitor list and Home's unsubscribed footer
      // still name the show after the user unsubscribes. dismissed_from_list hides completes from
      // the monitor without deleting the file (offline play and storage counts still use the row).
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
        updated_at INTEGER NOT NULL,
        channel_id_text TEXT,
        channel_title TEXT,
        dismissed_from_list INTEGER NOT NULL DEFAULT 0
      );`,
      `CREATE INDEX IF NOT EXISTS idx_download_status ON download (status);`,
      `CREATE INDEX IF NOT EXISTS idx_download_channel_id ON download (channel_id_text);`,
      // popularity_rank: the directory listen-count rank for Home's popularity order, stored beside
      // the follow so the subscribed list keeps that order with no connection. kind is the Home
      // chip bucket (podcasts vs artists vs albums), stamped from medium_id / Add by RSS
      // resourceType.
      `CREATE TABLE IF NOT EXISTS subscribed_channel (
        id_text TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        image_url TEXT,
        source TEXT NOT NULL,
        medium TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        popularity_rank INTEGER,
        kind TEXT NOT NULL DEFAULT 'podcasts'
      );`,
      `CREATE INDEX IF NOT EXISTS idx_subscribed_channel_kind ON subscribed_channel (kind);`,
      // details_json: structured diagnostics for one error-log entry (media URL, host HTTP status,
      // ids). A null renders with code and message only.
      `CREATE TABLE IF NOT EXISTS sync_event_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        occurred_at INTEGER NOT NULL,
        job_kind TEXT NOT NULL,
        outcome TEXT NOT NULL,
        error_code TEXT,
        message TEXT,
        details_json TEXT
      );`,
      `CREATE INDEX IF NOT EXISTS idx_sync_event_log_occurred_at ON sync_event_log (occurred_at);`,
      // popularity_rank: the directory listen-count rank, kept so popularity order works offline.
      `CREATE TABLE IF NOT EXISTS channel_item (
        item_id_text TEXT PRIMARY KEY NOT NULL,
        channel_id_text TEXT NOT NULL,
        title TEXT,
        image_url TEXT,
        pub_date_ms INTEGER,
        payload_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        popularity_rank INTEGER
      );`,
      `CREATE INDEX IF NOT EXISTS idx_channel_item_channel_pub_date
        ON channel_item (channel_id_text, pub_date_ms DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_channel_item_pub_date ON channel_item (pub_date_ms DESC);`,
      `CREATE TABLE IF NOT EXISTS channel_item_window (
        channel_id_text TEXT PRIMARY KEY NOT NULL,
        depth INTEGER NOT NULL,
        synced_at INTEGER
      );`,
      `CREATE TABLE IF NOT EXISTS channel_seen (
        subscription_key TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL,
        last_seen_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );`,
      // Live items are excluded from every regular item query, so `channel_item` can never answer
      // "is this channel broadcasting" and the row would have to ask the network to draw itself.
      `CREATE TABLE IF NOT EXISTS channel_live_status (
        subscription_key TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL,
        status_id INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );`,
      // Evidence-chip visibility for a channel or item, keyed as channel:<id> / item:<id>.
      `CREATE TABLE IF NOT EXISTS section_chrome_flags (
        cache_key TEXT PRIMARY KEY NOT NULL,
        flags_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );`,
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
      // Offline-first playlist metadata used by My playlists / followed playlists lists.
      `CREATE TABLE IF NOT EXISTS playlist (
        id_text TEXT PRIMARY KEY NOT NULL,
        id INTEGER NOT NULL,
        title TEXT,
        description TEXT,
        medium_id INTEGER NOT NULL,
        sharable_status_id INTEGER NOT NULL,
        is_default_likes INTEGER NOT NULL,
        item_count INTEGER NOT NULL,
        last_updated TEXT NOT NULL,
        owner_account_id_text TEXT,
        is_owned INTEGER NOT NULL DEFAULT 0,
        is_followed INTEGER NOT NULL DEFAULT 0,
        payload_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_playlist_owned_last_updated
        ON playlist (is_owned, last_updated DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_playlist_followed_last_updated
        ON playlist (is_followed, last_updated DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_playlist_medium
        ON playlist (medium_id);`,
      // Playlist resources are keyed by server resource id and grouped by playlist id_text for
      // list-order reads.
      `CREATE TABLE IF NOT EXISTS playlist_resource (
        id INTEGER PRIMARY KEY NOT NULL,
        playlist_id INTEGER NOT NULL,
        playlist_id_text TEXT NOT NULL,
        list_position TEXT NOT NULL,
        clip_id INTEGER,
        item_id INTEGER,
        item_soundbite_id INTEGER,
        add_by_rss_hash_id TEXT,
        payload_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_playlist_resource_playlist_position
        ON playlist_resource (playlist_id_text, list_position);`,
      `CREATE INDEX IF NOT EXISTS idx_playlist_resource_playlist_updated
        ON playlist_resource (playlist_id_text, updated_at DESC);`,
      // Per-channel auto-download opt-in. enabled_at is the watermark so enabling never backfills.
      `CREATE TABLE IF NOT EXISTS channel_auto_download (
        channel_id_text TEXT PRIMARY KEY NOT NULL,
        source TEXT NOT NULL,
        enabled INTEGER NOT NULL,
        allow_cellular INTEGER NOT NULL,
        enabled_at INTEGER,
        updated_at INTEGER NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_channel_auto_download_enabled
        ON channel_auto_download (enabled);`,
      // One decision per item. user_removed keeps a deleted download from being re-fetched.
      `CREATE TABLE IF NOT EXISTS auto_download_candidate (
        item_id_text TEXT PRIMARY KEY NOT NULL,
        channel_id_text TEXT NOT NULL,
        status TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_auto_download_candidate_channel_status
        ON auto_download_candidate (channel_id_text, status);`,
      `CREATE INDEX IF NOT EXISTS idx_auto_download_candidate_status
        ON auto_download_candidate (status);`,
      // Non-secret index of which feeds hold SecureStore credentials per account. SecureStore
      // cannot enumerate its keys, so sign-out and list partitioning read this table instead.
      `CREATE TABLE IF NOT EXISTS add_by_rss_credential_index (
        account_id_text TEXT NOT NULL,
        feed_url TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (account_id_text, feed_url)
      );`,
      // Whole item payloads for items the car can play that no other table keeps whole: live
      // items (excluded from every regular item query) and downloads (whose row holds only
      // display scalars). The phone needs the full item to adopt what the car started.
      `CREATE TABLE IF NOT EXISTS playable_item (
        item_id_text TEXT NOT NULL,
        source TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (item_id_text, source)
      );`,
      `CREATE INDEX IF NOT EXISTS idx_playable_item_source ON playable_item (source);`,
      // Ids already rewritten onto a survivor. The same pair is not written again.
      `CREATE TABLE IF NOT EXISTS identity_remap_applied (
        from_id_text TEXT PRIMARY KEY NOT NULL,
        to_id_text TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      );`,
      // Full show notes per item, read when a screen needs more than the list payload carries.
      // A null value means the item has no notes. Pinned rows belong to downloaded items and are
      // never evicted, so their notes stay readable offline.
      `CREATE TABLE IF NOT EXISTS item_description_cache (
        item_id_text TEXT PRIMARY KEY NOT NULL,
        value TEXT,
        preview TEXT,
        is_truncated INTEGER NOT NULL DEFAULT 0,
        link_url TEXT,
        pinned INTEGER NOT NULL DEFAULT 0,
        fetched_at INTEGER NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_item_description_cache_evict
        ON item_description_cache (pinned, fetched_at);`,
      // What each Add by RSS artist on this device lists, replaced whole on every artist parse.
      `CREATE TABLE IF NOT EXISTS add_by_rss_listed_feed (
        publisher_feed_url TEXT NOT NULL,
        feed_guid TEXT NOT NULL,
        position INTEGER NOT NULL,
        kind TEXT NOT NULL,
        feed_url TEXT,
        title TEXT,
        listed_at_channel_level INTEGER NOT NULL,
        item_guids_json TEXT NOT NULL,
        channel_id_text TEXT,
        channel_title TEXT,
        medium_id INTEGER,
        image_url TEXT,
        artwork_checked INTEGER NOT NULL DEFAULT 0,
        pending_request_id TEXT,
        unresolved_reason TEXT,
        PRIMARY KEY (publisher_feed_url, feed_guid)
      );`,
      `CREATE INDEX IF NOT EXISTS idx_add_by_rss_listed_feed_guid
        ON add_by_rss_listed_feed (feed_guid);`,
      `CREATE INDEX IF NOT EXISTS idx_add_by_rss_listed_feed_channel
        ON add_by_rss_listed_feed (channel_id_text);`,
      // One row per listen session waiting to reach the server. A later report of the same
      // session merges into its row; the row goes once the server accepts the latest state.
      `CREATE TABLE IF NOT EXISTS stats_listen_outbox (
        client_listen_id TEXT PRIMARY KEY NOT NULL,
        account_id_text TEXT NOT NULL,
        target_kind TEXT NOT NULL,
        target_id_text TEXT NOT NULL,
        seconds_heard INTEGER NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        first_report INTEGER NOT NULL DEFAULT 1,
        counted_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_stats_listen_outbox_account
        ON stats_listen_outbox (account_id_text, counted_at);`,
    ],
  },
  {
    version: 2,
    statements: [
      `ALTER TABLE stats_listen_outbox ADD COLUMN media_duration_seconds REAL;`,
    ],
  },
];

export const LATEST_MIGRATION_VERSION: number = MIGRATIONS.reduce(
  (max, migration) => (migration.version > max ? migration.version : max),
  0
);
