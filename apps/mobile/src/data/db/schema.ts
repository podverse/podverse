import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Generic key/value metadata for the sync layer (per-domain watermarks, last-synced-at, and small
 * flags). Domain-specific metadata can use forward-only migrations alongside this table.
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
 * keeps the phone UI working offline with last-synced data. `updated_at` drives staleness (TTL) for
 * read-through, while native-cache projections are maintained by the repositories.
 */
export const queueCache = sqliteTable('queue_cache', {
  cacheKey: text('cache_key').primaryKey(),
  payloadJson: text('payload_json').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type QueueCacheRow = typeof queueCache.$inferSelect;
export type QueueCacheInsert = typeof queueCache.$inferInsert;

/**
 * Pending playback mutations for signed-in users. Rows are replayed to the API in occurred-at
 * order when the network is usable again.
 */
export const playbackOutbox = sqliteTable('playback_outbox', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: text('event_id').notNull(),
  accountIdText: text('account_id_text').notNull(),
  queueIdText: text('queue_id_text').notNull(),
  resourceKind: text('resource_kind').notNull(),
  resourceIdText: text('resource_id_text').notNull(),
  eventKind: text('event_kind').notNull(),
  occurredAt: integer('occurred_at').notNull(),
  playbackPosition: real('playback_position'),
  mediaFileDuration: real('media_file_duration'),
  completed: integer('completed'),
  payloadJson: text('payload_json'),
});

export type PlaybackOutboxRow = typeof playbackOutbox.$inferSelect;
export type PlaybackOutboxInsert = typeof playbackOutbox.$inferInsert;

/**
 * Last-known playback state per resource for signed-in users, independent from pending outbox rows.
 */
export const playbackLocalState = sqliteTable(
  'playback_local_state',
  {
    accountIdText: text('account_id_text').notNull(),
    queueIdText: text('queue_id_text').notNull(),
    resourceKind: text('resource_kind').notNull(),
    resourceIdText: text('resource_id_text').notNull(),
    playbackPosition: real('playback_position').notNull(),
    mediaFileDuration: real('media_file_duration'),
    completed: integer('completed').notNull().default(0),
    zone: text('zone').notNull(),
    lastMeaningfulAt: integer('last_meaningful_at').notNull(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.accountIdText, table.queueIdText, table.resourceKind, table.resourceIdText],
    }),
  })
);

export type PlaybackLocalStateRow = typeof playbackLocalState.$inferSelect;
export type PlaybackLocalStateInsert = typeof playbackLocalState.$inferInsert;

/**
 * Add-by-RSS feeds the account follows, keyed by `feed_url`. This is the source of truth for the
 * mobile RSS list and add-by-RSS playback (retiring the slim AsyncStorage store). `mapped_feed_json`
 * holds the full `@podverse/parser-mapping` compat bundle from the last successful server parse, so
 * playback can build full `AddByRSSResourceData` and the list works offline. Scalar columns mirror
 * `MobileAddByRSSFeedRecord` for direct row→record mapping without re-parsing the bundle.
 *
 * `latest_item_pub_date_ms` is one of those scalars, extracted from the bundle when a parse lands.
 * It is what lets the subscription list order add-by-RSS feeds by recency beside directory channels
 * without deserializing a whole feed per row. `updated_at` cannot stand in: it says when this device
 * last refreshed the feed, not when the feed last published.
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
  latestItemPubDateMs: integer('latest_item_pub_date_ms'),
  mappedFeedJson: text('mapped_feed_json'),
  updatedAt: text('updated_at').notNull(),
});

export type AddByRssFeedRow = typeof addByRssFeed.$inferSelect;
export type AddByRssFeedInsert = typeof addByRssFeed.$inferInsert;

/**
 * Offline downloads index. Source of truth for the phone Downloads library and
 * for local-file playback. One row per downloadable item, keyed by `item_id_text`. Only progressive
 * (non-live, non-HLS) items get a row — eligibility is gated by `isItemDownloadable` before insert
 * (see src/downloads/README.md). `file_path` / `byte_size` fill in as the transfer completes.
 * Repositories that own this index project it to the native cache on every mutation (car/watch).
 */
export const download = sqliteTable('download', {
  itemIdText: text('item_id_text').primaryKey(),
  enclosureUri: text('enclosure_uri').notNull(),
  enclosureUrlHash: text('enclosure_url_hash').notNull(),
  enclosureMime: text('enclosure_mime'),
  mediaType: text('media_type').notNull(),
  fileExtension: text('file_extension'),
  filePath: text('file_path'),
  byteSize: integer('byte_size'),
  bytesDownloaded: integer('bytes_downloaded').notNull(),
  status: text('status').notNull(),
  title: text('title'),
  artworkUrl: text('artwork_url'),
  channelIdText: text('channel_id_text'),
  channelTitle: text('channel_title'),
  /** 0/1 — complete rows hidden from the Downloads monitor without deleting the file. */
  dismissedFromList: integer('dismissed_from_list').notNull().default(0),
  errorReason: text('error_reason'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type DownloadRow = typeof download.$inferSelect;
export type DownloadInsert = typeof download.$inferInsert;

/**
 * The device's **directory** channel follows, keyed by channel `id_text` (9b.8, 701).
 *
 * This is the source of truth for what the app displays as subscribed, so a signed-out user can
 * subscribe and keep it. It is **not** cleared on logout — the device keeps what it had.
 *
 * While signed in the account wins: `subscriptionsRepository.syncFromAccount` replaces these rows
 * wholesale with the account's follows (`DTOAccount.account_following_channels` carries only numeric
 * ids, so display fields are hydrated once from the subscribed list endpoint). Local subscriptions
 * made while signed out are pushed up **only** by the sign-up merge, never by a later sign-in.
 *
 * Add-by-RSS feeds are NOT duplicated here — they stay in `add_by_rss_feed`.
 */
export const subscribedChannel = sqliteTable('subscribed_channel', {
  idText: text('id_text').primaryKey(),
  title: text('title').notNull(),
  imageUrl: text('image_url'),
  source: text('source').notNull(),
  medium: text('medium').notNull(),
  /** Home chip bucket: podcasts | artists | albums. */
  kind: text('kind').notNull().default('podcasts'),
  popularityRank: integer('popularity_rank'),
  updatedAt: integer('updated_at').notNull(),
});

export type SubscribedChannelRow = typeof subscribedChannel.$inferSelect;
export type SubscribedChannelInsert = typeof subscribedChannel.$inferInsert;

/**
 * Items (episodes) for the directory channels this device follows, so a subscribed user can browse,
 * filter, sort, and play with no connection — not only the episodes downloaded as media files.
 *
 * `payload_json` holds the item exactly as the list endpoint delivered it, which is what lets an
 * episode open and play offline without a second request. The scalar columns beside it are the
 * ordering and display keys, so a list query never has to parse every payload to sort by date.
 *
 * How much is kept is decided per channel in `channel_item_window`; the rules live in the pure
 * `channelItemWindow.ts`. Add-by-RSS items are **not** duplicated here — those feeds are stored
 * whole in `add_by_rss_feed.mapped_feed_json`, which has no window to enforce.
 */
export const channelItem = sqliteTable('channel_item', {
  itemIdText: text('item_id_text').primaryKey(),
  channelIdText: text('channel_id_text').notNull(),
  title: text('title'),
  imageUrl: text('image_url'),
  pubDateMs: integer('pub_date_ms'),
  popularityRank: integer('popularity_rank'),
  payloadJson: text('payload_json').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type ChannelItemRow = typeof channelItem.$inferSelect;
export type ChannelItemInsert = typeof channelItem.$inferInsert;

/**
 * How deep into each channel this device stores, and when that depth was last reconciled.
 *
 * `depth` grows only when the user scrolls past what is stored while online, and the extension
 * persists so the next launch opens at the same reach. `synced_at` is what keeps an opportunistic
 * pass from re-fetching every subscription on every foreground transition.
 */
export const channelItemWindow = sqliteTable('channel_item_window', {
  channelIdText: text('channel_id_text').primaryKey(),
  depth: integer('depth').notNull(),
  syncedAt: integer('synced_at'),
});

export type ChannelItemWindowRow = typeof channelItemWindow.$inferSelect;
export type ChannelItemWindowInsert = typeof channelItemWindow.$inferInsert;

/**
 * Diagnostic record of background sync outcomes, capped so it stays invisible in device storage.
 *
 * The sync indicator deliberately says nothing when a job fails, so this is the only place a user
 * reporting "my podcasts aren't updating" can point at. `error_code` is the load-bearing column:
 * `message` is whatever the failure carried and may be in any language, while the code is stable
 * enough to read aloud to support.
 *
 * The autoincrement id is also the tiebreaker for ordering — two entries can share a millisecond,
 * and both newest-first display and oldest-first eviction need a total order.
 */
export const syncEventLog = sqliteTable('sync_event_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  occurredAt: integer('occurred_at').notNull(),
  jobKind: text('job_kind').notNull(),
  outcome: text('outcome').notNull(),
  errorCode: text('error_code'),
  message: text('message'),
});

export type SyncEventLogRow = typeof syncEventLog.$inferSelect;
export type SyncEventLogInsert = typeof syncEventLog.$inferInsert;

/**
 * When each subscription was last opened, which is what makes an unseen count derivable without
 * storing a flag per episode.
 *
 * Kept locally for every user, signed in or not, so a signed-out device still shows badges. For a
 * signed-in account the same value lives server-side and the two reconcile by keeping whichever is
 * later — the timestamp only ever moves forward.
 *
 * Directory channels and add-by-RSS feeds share one table because they answer the same question and
 * appear in the same list. `subscription_key` is the channel `id_text` or the feed URL, and `kind`
 * says which, since the two id spaces are unrelated and a feed URL is not an `id_text`.
 *
 * A missing row means never opened, which reads as nothing unseen.
 */
export const channelSeen = sqliteTable('channel_seen', {
  subscriptionKey: text('subscription_key').primaryKey(),
  kind: text('kind').notNull(),
  lastSeenAt: integer('last_seen_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type ChannelSeenRow = typeof channelSeen.$inferSelect;
export type ChannelSeenInsert = typeof channelSeen.$inferInsert;

/**
 * Which subscriptions are broadcasting, so the live badge draws from the device like every other
 * part of the row.
 *
 * Nothing else on the device can answer this. Live items are excluded from every regular item query
 * on the server, so the items stored for a channel never contain one, and the channel record itself
 * carries no live field.
 *
 * Keyed like `channel_seen` — the channel `id_text` or the feed URL, with `kind` saying which —
 * because the two arrive from different places. Directory statuses are replaced wholesale by the
 * live-item sync, while an add-by-RSS feed declares its own inside the bundle and is written when
 * that feed is parsed.
 *
 * `updated_at` is load-bearing rather than bookkeeping: a broadcast ends whether or not this device
 * is online to hear about it, so a status is only trusted while it is recent.
 */
export const channelLiveStatus = sqliteTable('channel_live_status', {
  subscriptionKey: text('subscription_key').primaryKey(),
  kind: text('kind').notNull(),
  statusId: integer('status_id').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type ChannelLiveStatusRow = typeof channelLiveStatus.$inferSelect;
export type ChannelLiveStatusInsert = typeof channelLiveStatus.$inferInsert;

/**
 * Last-known evidence chips for a channel or item (Official clips, Podroll, chapters, …).
 *
 * Always-on chips are not stored here. These flags exist so a later open can paint the
 * evidence chips on the first frame instead of waiting on the detail DTO. `cache_key` is
 * `channel:<id_text>` or `item:<id_text>`.
 */
export const sectionChromeFlags = sqliteTable('section_chrome_flags', {
  cacheKey: text('cache_key').primaryKey(),
  flagsJson: text('flags_json').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type SectionChromeFlagsRow = typeof sectionChromeFlags.$inferSelect;
export type SectionChromeFlagsInsert = typeof sectionChromeFlags.$inferInsert;

/**
 * Cached playlists for the Library playlists surfaces. `payload_json` stores the full DTOPlaylist;
 * scalar columns support local filtering and ordering.
 */
export const playlist = sqliteTable('playlist', {
  idText: text('id_text').primaryKey(),
  id: integer('id').notNull(),
  title: text('title'),
  description: text('description'),
  mediumId: integer('medium_id').notNull(),
  sharableStatusId: integer('sharable_status_id').notNull(),
  isDefaultLikes: integer('is_default_likes').notNull(),
  itemCount: integer('item_count').notNull(),
  lastUpdated: text('last_updated').notNull(),
  ownerAccountIdText: text('owner_account_id_text'),
  /** 0/1 flags used for local My vs Followed list filtering. */
  isOwned: integer('is_owned').notNull().default(0),
  isFollowed: integer('is_followed').notNull().default(0),
  payloadJson: text('payload_json').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type PlaylistRow = typeof playlist.$inferSelect;
export type PlaylistInsert = typeof playlist.$inferInsert;

/**
 * Cached playlist resources keyed by server resource id. The same DTOPlaylistResource row is used
 * for item, clip, soundbite, and add-by-RSS resources.
 */
export const playlistResource = sqliteTable('playlist_resource', {
  id: integer('id').primaryKey(),
  playlistId: integer('playlist_id').notNull(),
  playlistIdText: text('playlist_id_text').notNull(),
  listPosition: text('list_position').notNull(),
  clipId: integer('clip_id'),
  itemId: integer('item_id'),
  itemSoundbiteId: integer('item_soundbite_id'),
  addByRssHashId: text('add_by_rss_hash_id'),
  payloadJson: text('payload_json').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type PlaylistResourceRow = typeof playlistResource.$inferSelect;
export type PlaylistResourceInsert = typeof playlistResource.$inferInsert;

/**
 * Per-channel auto-download settings. Device-local; the server only mirrors enabled channel ids
 * per installation for silent-push wakeups. `enabled_at` is the no-backfill watermark.
 */
export const channelAutoDownload = sqliteTable('channel_auto_download', {
  channelIdText: text('channel_id_text').primaryKey(),
  source: text('source').notNull(),
  enabled: integer('enabled').notNull(),
  allowCellular: integer('allow_cellular').notNull(),
  enabledAt: integer('enabled_at'),
  updatedAt: integer('updated_at').notNull(),
});

export type ChannelAutoDownloadRow = typeof channelAutoDownload.$inferSelect;
export type ChannelAutoDownloadInsert = typeof channelAutoDownload.$inferInsert;

/**
 * Idempotent auto-download ledger. An item is decided once so sync/push retries and user deletes
 * do not re-enqueue the same episode.
 */
export const autoDownloadCandidate = sqliteTable('auto_download_candidate', {
  itemIdText: text('item_id_text').primaryKey(),
  channelIdText: text('channel_id_text').notNull(),
  status: text('status').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type AutoDownloadCandidateRow = typeof autoDownloadCandidate.$inferSelect;
export type AutoDownloadCandidateInsert = typeof autoDownloadCandidate.$inferInsert;
