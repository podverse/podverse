import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Generic key/value metadata for the sync layer (per-domain watermarks, last-synced-at,
 * small flags). Domain tables (account, queue, add-by-rss) are added by later Track 9b steps
 * via their own forward-only migrations — this scaffold table just proves the pattern and gives
 * the sync layer a home before the first repository lands.
 *
 * Never store auth tokens here — tokens live in SecureStore only (see src/data/README.md).
 */
export const kvMeta = sqliteTable('kv_meta', {
  key: text('key').primaryKey(),
  value: text('value'),
  updatedAt: integer('updated_at'),
});

export type KvMetaRow = typeof kvMeta.$inferSelect;
export type KvMetaInsert = typeof kvMeta.$inferInsert;

/**
 * Cold-start account snapshot. Stores the `/auth/me` DTOAccount payload as JSON (single row keyed
 * `current`) so a logged-in launch can render the account immediately while a background
 * soft-refresh runs. Tokens are never stored here — they stay in SecureStore.
 */
export const accountSnapshot = sqliteTable('account_snapshot', {
  id: text('id').primaryKey(),
  payloadJson: text('payload_json').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type AccountSnapshotRow = typeof accountSnapshot.$inferSelect;
export type AccountSnapshotInsert = typeof accountSnapshot.$inferInsert;

/**
 * Last-synced queue data cached as JSON, keyed by a domain cache key (e.g. `queues`,
 * `now-playing:{queueIdText}`, `upcoming:{queueIdText}`, `history:{queueIdText}:{page}`). This
 * keeps the phone UI working offline with last-synced data. Track 10 adds mutations; Track 12
 * normalizes for the native cache. `updated_at` drives staleness (TTL) for read-through.
 */
export const queueCache = sqliteTable('queue_cache', {
  cacheKey: text('cache_key').primaryKey(),
  payloadJson: text('payload_json').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type QueueCacheRow = typeof queueCache.$inferSelect;
export type QueueCacheInsert = typeof queueCache.$inferInsert;

/**
 * Add-by-RSS feeds the account follows, keyed by `feed_url`. This is the source of truth for the
 * mobile RSS list and add-by-RSS playback (retiring the slim AsyncStorage store). `mapped_feed_json`
 * holds the full `@podverse/parser-mapping` compat bundle from the last successful server parse, so
 * playback can build full `AddByRSSResourceData` and the list works offline. Scalar columns mirror
 * `MobileAddByRSSFeedRecord` for direct row→record mapping without re-parsing the bundle.
 */
export const addByRssFeed = sqliteTable('add_by_rss_feed', {
  feedUrl: text('feed_url').primaryKey(),
  id: integer('id').notNull(),
  idText: text('id_text').notNull(),
  resourceType: text('resource_type').notNull(),
  title: text('title'),
  imageUrl: text('image_url'),
  enclosureUrl: text('enclosure_url'),
  playbackPosition: text('playback_position'),
  mappedFeedJson: text('mapped_feed_json'),
  updatedAt: text('updated_at').notNull(),
});

export type AddByRssFeedRow = typeof addByRssFeed.$inferSelect;
export type AddByRssFeedInsert = typeof addByRssFeed.$inferInsert;
