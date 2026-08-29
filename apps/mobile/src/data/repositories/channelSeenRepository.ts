import { eq, inArray, sql } from 'drizzle-orm';

import { countUnseenByPubDate } from '@podverse/helpers';

// Import directly from the request module (not the auth barrel) to avoid a cycle, mirroring
// subscriptionsRepository (AuthProvider → accountRepository → auth barrel → AuthProvider).
import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { getDb, initializeDatabase, safeJsonParse, schema } from '../db';
import type { SeenEntry, StoredAddByRssBundle } from './channelSeenSync';
import { readAddByRssPubDatesMs, reconcileSeenState } from './channelSeenSync';
import type { MobileAuthRequestContext, SubscriptionKind } from './types';

/**
 * Per-subscription **seen** state and the unseen counts derived from it.
 *
 * Everything reads from the device, so a signed-out user gets working badges and a signed-in one
 * gets them offline. The counts come from the episodes already stored by `channelItemsRepository`
 * and `addByRssRepository` — deriving them here rather than fetching them is what keeps the badge
 * available with no connection and makes it agree with the list it sits beside.
 *
 * For a signed-in account the same timestamps live server-side. The two reconcile by keeping
 * whichever is later, in both directions, so opening a channel on the website clears it on the
 * phone and vice versa. Because the value only advances, that merge is safe to run on every sync.
 */

export type ChannelSeenUnseen = {
  subscriptionKey: string;
  kind: SubscriptionKind;
  lastSeenAtMs: number | null;
  unseenCount: number;
  hasMoreUnseen: boolean;
};

/** Channels the server accepts per mark or page request. Larger lists are chunked. */
const SEEN_REQUEST_CHUNK_SIZE = 60;

/** Stop paging server state at a depth no real subscription list reaches, so a bad page cursor cannot spin. */
const MAX_SEEN_PAGES = 50;

const chunked = <T>(values: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
};

const readStoredPubDatesMs = (mappedFeedJson: string | null): (number | null)[] => {
  return readAddByRssPubDatesMs(
    mappedFeedJson === null ? null : safeJsonParse<StoredAddByRssBundle>(mappedFeedJson)
  );
};

const readSeenMap = async (): Promise<Map<string, number>> => {
  const rows = await getDb().select().from(schema.channelSeen);
  return new Map(rows.map((row) => [row.subscriptionKey, row.lastSeenAt]));
};

/**
 * Walk a paginated seen-state endpoint to the end.
 *
 * Both lists are bounded by how much the account follows, and `MAX_SEEN_PAGES` is a stop far past
 * any real subscription list — it exists so a server that keeps returning full pages cannot spin
 * the sync queue's head forever.
 */
const readAllPages = async <T>(
  fetchPage: (page: number) => Promise<{ data: T[]; meta: { limit: number } }>
): Promise<T[]> => {
  const all: T[] = [];
  for (let page = 1; page <= MAX_SEEN_PAGES; page += 1) {
    const response = await fetchPage(page);
    all.push(...response.data);
    if (response.data.length < response.meta.limit) {
      break;
    }
  }
  return all;
};

/**
 * Write timestamps, keeping whichever is later.
 *
 * `MAX` in the upsert is what makes this monotonic in one statement: an out-of-order arrival from a
 * slow sync cannot undo a mark the user just made by opening the channel.
 */
const upsertSeen = async (entries: readonly SeenEntry[]): Promise<void> => {
  if (entries.length === 0) {
    return;
  }

  const now = Date.now();
  for (const chunk of chunked(entries, SEEN_REQUEST_CHUNK_SIZE)) {
    await getDb()
      .insert(schema.channelSeen)
      .values(
        chunk.map((entry) => ({
          subscriptionKey: entry.subscriptionKey,
          kind: entry.kind,
          lastSeenAt: entry.lastSeenAtMs,
          updatedAt: now,
        }))
      )
      .onConflictDoUpdate({
        target: schema.channelSeen.subscriptionKey,
        set: {
          kind: sql`excluded.kind`,
          lastSeenAt: sql`MAX(${schema.channelSeen.lastSeenAt}, excluded.last_seen_at)`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }
};

export const channelSeenRepository = {
  /**
   * Record that the user has opened a subscription.
   *
   * Local-first and unqueued: the badge must clear the instant the screen opens, whatever the
   * network is doing. Telling the account happens separately, on the sync queue.
   */
  markSeen: async (
    subscriptionKey: string,
    kind: SubscriptionKind,
    seenAtMs: number = Date.now()
  ): Promise<void> => {
    await initializeDatabase();
    await upsertSeen([{ kind, lastSeenAtMs: seenAtMs, subscriptionKey }]);
  },

  /**
   * Record that the user has caught up on every subscription at once.
   *
   * Marks the channels and feeds actually followed right now rather than every row already in the
   * table, so a stale entry for something unfollowed elsewhere is not resurrected with a fresh
   * timestamp.
   *
   * One timestamp for the whole sweep, so all of them advance to the same instant and the badges
   * clear together rather than in write order. Telling the account happens on the sync queue, by
   * the same push that carries an ordinary mark — this only writes locally, so it works signed out
   * and returns before the network is consulted.
   */
  markAllSeen: async (seenAtMs: number = Date.now()): Promise<void> => {
    await initializeDatabase();

    const [channelRows, feedRows] = await Promise.all([
      getDb().select({ idText: schema.subscribedChannel.idText }).from(schema.subscribedChannel),
      getDb().select({ feedUrl: schema.addByRssFeed.feedUrl }).from(schema.addByRssFeed),
    ]);

    await upsertSeen([
      ...channelRows.map((row) => ({
        kind: 'channel' as const,
        lastSeenAtMs: seenAtMs,
        subscriptionKey: row.idText,
      })),
      ...feedRows.map((row) => ({
        kind: 'add-by-rss' as const,
        lastSeenAtMs: seenAtMs,
        subscriptionKey: row.feedUrl,
      })),
    ]);
  },

  /**
   * Unseen counts for every current subscription.
   *
   * Directory channels count against the episodes stored locally, which is a bounded window rather
   * than the whole feed — so a badge can under-report a channel that published more than the window
   * holds. That is the right trade: the count describes what the user can actually open offline.
   *
   * Add-by-RSS feeds are stored whole, so their counts are exact.
   */
  listUnseen: async (): Promise<ChannelSeenUnseen[]> => {
    await initializeDatabase();

    const seenByKey = await readSeenMap();
    const results: ChannelSeenUnseen[] = [];

    const itemRows = await getDb()
      .select({
        channelIdText: schema.channelItem.channelIdText,
        pubDateMs: schema.channelItem.pubDateMs,
      })
      .from(schema.channelItem);

    const pubDatesByChannel = new Map<string, (number | null)[]>();
    for (const row of itemRows) {
      const existing = pubDatesByChannel.get(row.channelIdText);
      if (existing === undefined) {
        pubDatesByChannel.set(row.channelIdText, [row.pubDateMs]);
      } else {
        existing.push(row.pubDateMs);
      }
    }

    const channelRows = await getDb()
      .select({ idText: schema.subscribedChannel.idText })
      .from(schema.subscribedChannel);

    for (const row of channelRows) {
      const lastSeenAtMs = seenByKey.get(row.idText) ?? null;
      const { has_more_unseen, unseen_count } = countUnseenByPubDate({
        lastSeenAtMs,
        pubDatesMs: pubDatesByChannel.get(row.idText) ?? [],
      });
      results.push({
        hasMoreUnseen: has_more_unseen,
        kind: 'channel',
        lastSeenAtMs,
        subscriptionKey: row.idText,
        unseenCount: unseen_count,
      });
    }

    const feedRows = await getDb()
      .select({
        feedUrl: schema.addByRssFeed.feedUrl,
        mappedFeedJson: schema.addByRssFeed.mappedFeedJson,
      })
      .from(schema.addByRssFeed);

    for (const row of feedRows) {
      const lastSeenAtMs = seenByKey.get(row.feedUrl) ?? null;
      const { has_more_unseen, unseen_count } = countUnseenByPubDate({
        lastSeenAtMs,
        pubDatesMs: readStoredPubDatesMs(row.mappedFeedJson),
      });
      results.push({
        hasMoreUnseen: has_more_unseen,
        kind: 'add-by-rss',
        lastSeenAtMs,
        subscriptionKey: row.feedUrl,
        unseenCount: unseen_count,
      });
    }

    return results;
  },

  /**
   * Reconcile local timestamps with the account's, in both directions.
   *
   * Pulls the account's state first, then pushes back anything the device knows to be later. Both
   * sides keep the later value, so running this repeatedly settles rather than oscillating, and a
   * device that was offline while the user listened elsewhere does not re-badge what they heard.
   *
   * Bounded: the server pages its answer and every push is chunked, so an account following
   * hundreds of shows still syncs in a predictable number of requests.
   */
  syncWithAccount: async (context: MobileAuthRequestContext): Promise<void> => {
    await initializeDatabase();

    const channelStates = await readAllPages(async (page) =>
      requestWithMobileAuthRefresh(context, async (api) => api.reqAccountChannelSeenList({ page }))
    );
    const feedStates = await readAllPages(async (page) =>
      requestWithMobileAuthRefresh(context, async (api) =>
        api.reqAccountChannelSeenListAddByRss({ page })
      )
    );

    const seenByKey = await readSeenMap();

    const channelPlan = reconcileSeenState(
      channelStates.map((state) => ({
        remoteLastSeenAt: state.last_seen_at,
        subscriptionKey: state.channel_id_text,
      })),
      'channel',
      seenByKey
    );
    const feedPlan = reconcileSeenState(
      feedStates.map((state) => ({
        remoteLastSeenAt: state.last_seen_at,
        subscriptionKey: state.feed_url,
      })),
      'add-by-rss',
      seenByKey
    );

    await upsertSeen([...channelPlan.adopt, ...feedPlan.adopt]);

    for (const chunk of chunked(channelPlan.push, SEEN_REQUEST_CHUNK_SIZE)) {
      await requestWithMobileAuthRefresh(context, async (api) =>
        api.reqAccountChannelSeenMark({
          entries: chunk.map((entry) => ({
            channel_id_text: entry.subscriptionKey,
            last_seen_at: new Date(entry.lastSeenAtMs).toISOString(),
          })),
        })
      );
    }

    for (const chunk of chunked(feedPlan.push, SEEN_REQUEST_CHUNK_SIZE)) {
      await requestWithMobileAuthRefresh(context, async (api) =>
        api.reqAccountChannelSeenMarkAddByRss({
          entries: chunk.map((entry) => ({
            feed_url: entry.subscriptionKey,
            last_seen_at: new Date(entry.lastSeenAtMs).toISOString(),
          })),
        })
      );
    }
  },

  /**
   * Drop state for subscriptions no longer followed.
   *
   * Unfollowing on this device removes its row immediately. This is for the other case: unfollowing
   * somewhere else, which this device only learns about when the account list is next reconciled.
   * Without it a long-lived install accumulates a row per show it ever followed.
   */
  retainSubscriptions: async (subscriptionKeys: readonly string[]): Promise<void> => {
    await initializeDatabase();

    const keep = new Set(subscriptionKeys);
    const rows = await getDb()
      .select({ subscriptionKey: schema.channelSeen.subscriptionKey })
      .from(schema.channelSeen);
    const drop = rows
      .map((row) => row.subscriptionKey)
      .filter((subscriptionKey) => !keep.has(subscriptionKey));

    for (const chunk of chunked(drop, SEEN_REQUEST_CHUNK_SIZE)) {
      await getDb()
        .delete(schema.channelSeen)
        .where(inArray(schema.channelSeen.subscriptionKey, chunk));
    }
  },

  remove: async (subscriptionKey: string): Promise<void> => {
    await initializeDatabase();
    await getDb()
      .delete(schema.channelSeen)
      .where(eq(schema.channelSeen.subscriptionKey, subscriptionKey));
  },

  clear: async (): Promise<void> => {
    await initializeDatabase();
    await getDb().delete(schema.channelSeen);
  },
};
