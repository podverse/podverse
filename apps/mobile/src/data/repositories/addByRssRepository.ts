import { desc, eq } from 'drizzle-orm';

import type { AddByRSSParseCacheEntry } from '@podverse/helpers';
import type { AddByRSSMappedFeed } from '@podverse/parser-mapping';

// Import directly from the request module (not the auth barrel) to avoid a cycle, mirroring
// accountRepository (AuthProvider → accountRepository → auth barrel → AuthProvider).
import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { buildAddByRssFeedRecord, pollAddByRssParseStatus } from '../../lib/addByRss/domain';
import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import { getDb, initializeDatabase, safeJsonParse, schema } from '../db';
import type { AddByRssFeedRow } from '../db/schema';
import { channelLiveStatusRepository } from './channelLiveStatusRepository';
import { channelSeenRepository } from './channelSeenRepository';
import type { MobileAuthRequestContext } from './types';

const isResourceType = (value: string): value is MobileAddByRSSFeedRecord['resourceType'] => {
  return (
    value === 'podcasts' ||
    value === 'episodes' ||
    value === 'artists' ||
    value === 'albums' ||
    value === 'tracks' ||
    value === 'livestreams'
  );
};

const rowToRecord = (row: AddByRssFeedRow): MobileAddByRSSFeedRecord => {
  return {
    id: row.id,
    idText: row.idText,
    resourceType: isResourceType(row.resourceType) ? row.resourceType : 'podcasts',
    feedUrl: row.feedUrl,
    title: row.title,
    imageUrl: row.imageUrl,
    updatedAt: row.updatedAt,
    enclosureUrl: row.enclosureUrl,
    latestItemPubDateMs: row.latestItemPubDateMs,
    playbackPosition: row.playbackPosition,
  };
};

/** What a refresh request returns per feed: the ticket to poll for that feed's parse result. */
export type AddByRssRefreshTicket = {
  feedUrl: string;
  requestId: string;
};

type ParseAllResponse = {
  request_ids: { feed_url: string; request_id: string }[];
};

/**
 * Add-by-RSS feed repository — the source of truth for the mobile RSS list and add-by-RSS playback.
 *
 * Reads SQLite first so the list works offline. Each feed is stored **whole**, as the last
 * successful `@podverse/parser-mapping` compat bundle: the user chose the feed explicitly and there
 * is no server-side pagination behind it, so there is no window to enforce the way there is for
 * directory channels in `channelItemsRepository`.
 *
 * The interactive add/follow/unfollow calls stay in the hooks that orchestrate those flows. Keeping
 * a followed feed current is background reconciliation rather than a user action, so it lives here
 * where the sync queue can reach it (see mobile-data-layer skill).
 */
export const addByRssRepository = {
  /** All followed feeds, most-recently-updated first (offline-capable list). */
  listFeeds: async (): Promise<MobileAddByRSSFeedRecord[]> => {
    await initializeDatabase();
    const rows = await getDb()
      .select()
      .from(schema.addByRssFeed)
      .orderBy(desc(schema.addByRssFeed.updatedAt));

    return rows.map(rowToRecord);
  },

  getFeedByUrl: async (feedUrl: string): Promise<MobileAddByRSSFeedRecord | null> => {
    await initializeDatabase();
    const rows = await getDb()
      .select()
      .from(schema.addByRssFeed)
      .where(eq(schema.addByRssFeed.feedUrl, feedUrl))
      .limit(1);

    const row = rows[0];
    return row === undefined ? null : rowToRecord(row);
  },

  getFeedByIdText: async (idText: string): Promise<MobileAddByRSSFeedRecord | null> => {
    await initializeDatabase();
    const rows = await getDb()
      .select()
      .from(schema.addByRssFeed)
      .where(eq(schema.addByRssFeed.idText, idText))
      .limit(1);

    const row = rows[0];
    return row === undefined ? null : rowToRecord(row);
  },

  /** Read the last-parsed compat bundle for a feed (for full-resource-data playback). */
  getMappedFeedByUrl: async (feedUrl: string): Promise<AddByRSSMappedFeed | null> => {
    await initializeDatabase();
    const rows = await getDb()
      .select({ mappedFeedJson: schema.addByRssFeed.mappedFeedJson })
      .from(schema.addByRssFeed)
      .where(eq(schema.addByRssFeed.feedUrl, feedUrl))
      .limit(1);

    const raw = rows[0]?.mappedFeedJson ?? null;
    return raw === null ? null : safeJsonParse<AddByRSSMappedFeed>(raw);
  },

  /**
   * Upsert a feed record. When `mappedFeed` is provided (a fresh successful parse) its bundle is
   * persisted; when omitted (e.g. a followed-list merge), the existing `mapped_feed_json` is left
   * untouched so the parsed bundle is preserved.
   *
   * `latest_item_pub_date_ms` follows the bundle for the same reason: both are derived from a parse,
   * and a followed-list merge that wrote a null over a known date would drop a followed feed to the
   * bottom of a recency-ordered list until the next parse landed. The feed's live status is derived
   * at the same moment and for the same reason — reading it when the list is drawn would mean
   * deserializing a whole feed per row.
   */
  upsertFeed: async (
    record: MobileAddByRSSFeedRecord,
    mappedFeed?: AddByRSSMappedFeed | null
  ): Promise<void> => {
    await initializeDatabase();

    const baseValues = {
      feedUrl: record.feedUrl,
      id: record.id,
      idText: record.idText,
      resourceType: record.resourceType,
      title: record.title,
      imageUrl: record.imageUrl,
      enclosureUrl: record.enclosureUrl,
      playbackPosition: record.playbackPosition,
      updatedAt: record.updatedAt,
    };

    if (mappedFeed !== undefined) {
      const parsedValues = {
        latestItemPubDateMs: record.latestItemPubDateMs,
        mappedFeedJson: mappedFeed === null ? null : JSON.stringify(mappedFeed),
      };
      await getDb()
        .insert(schema.addByRssFeed)
        .values({ ...baseValues, ...parsedValues })
        .onConflictDoUpdate({
          target: schema.addByRssFeed.feedUrl,
          set: { ...baseValues, ...parsedValues },
        });
      await channelLiveStatusRepository.setFromAddByRssBundle(record.feedUrl, mappedFeed);
      return;
    }

    await getDb()
      .insert(schema.addByRssFeed)
      .values({
        ...baseValues,
        latestItemPubDateMs: record.latestItemPubDateMs,
        mappedFeedJson: null,
      })
      .onConflictDoUpdate({
        target: schema.addByRssFeed.feedUrl,
        set: baseValues,
      });
  },

  /**
   * Ask the server to re-parse every feed the account follows, and return a ticket per feed.
   *
   * One request rather than one per feed: the endpoint fans out server-side and dedupes feeds it
   * parsed recently, so a device that foregrounds often does not repeatedly ask for the same work.
   * Feeds the server deduped come back with no ticket and are simply left as they are.
   *
   * The caller is responsible for checking that the account may refresh at all — a lapsed
   * membership keeps its feeds readable and playable, and only stops them updating.
   */
  requestRefreshAll: async (
    context: MobileAuthRequestContext
  ): Promise<AddByRssRefreshTicket[]> => {
    const response = await requestWithMobileAuthRefresh(context, async (apiRequestService) =>
      apiRequestService.apiRequest<ParseAllResponse>({
        path: '/account/add-by-rss/parse/all',
        method: 'POST',
        config: {
          withCredentials: true,
        },
        data: {},
      })
    );

    return response.request_ids.map((entry) => ({
      feedUrl: entry.feed_url,
      requestId: entry.request_id,
    }));
  },

  /**
   * Poll one re-parse ticket and adopt the result.
   *
   * A parse that has not resolved yet, or resolved without a usable payload, leaves the stored
   * bundle untouched. Overwriting it with nothing would take a feed that reads and plays offline
   * today and leave the user with a title and no episodes, which is strictly worse than stale.
   */
  applyRefreshResult: async (
    context: MobileAuthRequestContext,
    ticket: AddByRssRefreshTicket
  ): Promise<boolean> => {
    const { mappedFeed, preview } = await pollAddByRssParseStatus(
      ticket.requestId,
      async (requestId) =>
        requestWithMobileAuthRefresh(context, async (apiRequestService) =>
          apiRequestService.apiRequest<AddByRSSParseCacheEntry<unknown>>({
            path: `/account/add-by-rss/parse/status/${requestId}`,
            method: 'GET',
            config: {
              withCredentials: true,
            },
          })
        )
    );

    if (mappedFeed === null) {
      return false;
    }

    const existingFeed = await addByRssRepository.getFeedByUrl(ticket.feedUrl);
    const record = buildAddByRssFeedRecord(ticket.feedUrl, existingFeed ?? undefined, preview);
    await addByRssRepository.upsertFeed(record, mappedFeed);
    return true;
  },

  removeFeed: async (feedUrl: string): Promise<void> => {
    await initializeDatabase();
    await getDb().delete(schema.addByRssFeed).where(eq(schema.addByRssFeed.feedUrl, feedUrl));
    await channelLiveStatusRepository.remove(feedUrl);
    await channelSeenRepository.remove(feedUrl);
  },

  /** Clear all feeds (session reset / logout). */
  clear: async (): Promise<void> => {
    await initializeDatabase();
    await getDb().delete(schema.addByRssFeed);
  },
};
