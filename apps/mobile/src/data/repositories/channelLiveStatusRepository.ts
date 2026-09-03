import { eq, inArray, sql } from 'drizzle-orm';

import type { DTOItem } from '@podverse/helpers/dto';
import { LiveItemStatusEnum } from '@podverse/helpers/dto';

// Import directly from the request module (not the auth barrel) to avoid a cycle, mirroring
// subscriptionsRepository (AuthProvider → accountRepository → auth barrel → AuthProvider).
import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { getDb, initializeDatabase, schema } from '../db';
import type { ChannelLiveStatusEntry, StoredAddByRssLiveBundle } from './channelLiveStatus';
import {
  readAddByRssLiveStatus,
  selectBroadcastingKeys,
  toChannelLiveStatuses,
} from './channelLiveStatus';
import type { MobileAuthRequestContext, SubscriptionKind } from './types';

/**
 * Which subscriptions are broadcasting, stored on the device so the live badge draws offline like
 * the rest of the row.
 *
 * The two kinds arrive by different routes. A directory channel's status exists only on the server —
 * live items are filtered out of every regular item query, so nothing in the local item store can
 * imply one — and comes from one request covering the whole subscription list. An add-by-RSS feed
 * declares its own inside the bundle already on disk, so that half works signed out and with no
 * connection.
 */

/** Requests one refresh will make before giving up on a very long list. */
const MAX_LIVE_PAGES = 5;

/** SQLite binds one parameter per column, so a bulk delete has to arrive in pieces. */
const DELETE_CHUNK_SIZE = 200;

const chunked = <T>(values: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
};

const toSubscriptionKind = (value: string): SubscriptionKind => {
  return value === 'add-by-rss' ? 'add-by-rss' : 'channel';
};

/** A status column holding something outside the enum reads as ended, which badges nothing. */
const toLiveItemStatus = (value: number): LiveItemStatusEnum => {
  if (value === LiveItemStatusEnum.Live || value === LiveItemStatusEnum.Pending) {
    return value;
  }
  return LiveItemStatusEnum.Ended;
};

const writeStatuses = async (entries: readonly ChannelLiveStatusEntry[]): Promise<void> => {
  if (entries.length === 0) {
    return;
  }

  const updatedAt = Date.now();
  await getDb()
    .insert(schema.channelLiveStatus)
    .values(
      entries.map((entry) => ({
        subscriptionKey: entry.subscriptionKey,
        kind: entry.kind,
        statusId: entry.statusId,
        updatedAt,
      }))
    )
    .onConflictDoUpdate({
      target: schema.channelLiveStatus.subscriptionKey,
      // Every row in the batch carries its own values, so the update has to read the row being
      // inserted rather than a single literal shared by all of them.
      set: {
        kind: sql`excluded.kind`,
        statusId: sql`excluded.status_id`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
};

export const channelLiveStatusRepository = {
  /**
   * The subscription keys to badge as live right now.
   *
   * Statuses older than the trust window are left out here rather than deleted, because a stale row
   * is still the last thing this device was told and the next refresh will simply overwrite it.
   */
  listBroadcastingKeys: async (): Promise<Set<string>> => {
    await initializeDatabase();
    const rows = await getDb().select().from(schema.channelLiveStatus);

    return selectBroadcastingKeys(
      rows.map((row) => ({
        kind: toSubscriptionKind(row.kind),
        statusId: toLiveItemStatus(row.statusId),
        subscriptionKey: row.subscriptionKey,
        updatedAtMs: row.updatedAt,
      }))
    );
  },

  /**
   * Replace what is known about directory channels with one look at the account's live items.
   *
   * Replacement rather than merge is what ends a broadcast: the endpoint answers "these are live",
   * so a channel absent from the answer is no longer live and its row has to go. That also makes
   * the refresh idempotent — running it twice leaves exactly the same rows.
   *
   * Signed-in only, because the endpoint answers for an account's follows. A signed-out device
   * keeps whatever its add-by-RSS feeds declare and shows no directory live badges.
   */
  refreshFromAccount: async (context: MobileAuthRequestContext): Promise<void> => {
    await initializeDatabase();

    const items: DTOItem[] = [];
    for (let page = 1; page <= MAX_LIVE_PAGES; page += 1) {
      const response = await requestWithMobileAuthRefresh(context, async (api) =>
        api.reqLiveItemGetMany(
          {
            category: null,
            medium: 'podcasts',
            page,
            range: null,
            sort: 'recent',
            type: 'subscribed',
          },
          'live'
        )
      );
      items.push(...response.data);
      if (response.data.length < response.meta.limit) {
        break;
      }
    }

    const statuses = toChannelLiveStatuses(items);
    await getDb()
      .delete(schema.channelLiveStatus)
      .where(eq(schema.channelLiveStatus.kind, 'channel'));
    await writeStatuses([...statuses.values()]);
  },

  /**
   * Record what a freshly parsed add-by-RSS feed says about itself.
   *
   * Called as the parse lands rather than when the list is read, so ordering a subscription list
   * never means deserializing a bundle per row. A feed that declares no live items clears its row,
   * which is how a finished broadcast stops being badged.
   */
  setFromAddByRssBundle: async (
    feedUrl: string,
    bundle: StoredAddByRssLiveBundle | null
  ): Promise<void> => {
    await initializeDatabase();

    const statusId = readAddByRssLiveStatus(bundle);
    if (statusId === null) {
      await channelLiveStatusRepository.remove(feedUrl);
      return;
    }

    await writeStatuses([{ kind: 'add-by-rss', statusId, subscriptionKey: feedUrl }]);
  },

  /** Forget one subscription's status, on unfollow. */
  remove: async (subscriptionKey: string): Promise<void> => {
    await initializeDatabase();
    await getDb()
      .delete(schema.channelLiveStatus)
      .where(eq(schema.channelLiveStatus.subscriptionKey, subscriptionKey));
  },

  /**
   * Keep only the subscriptions still followed.
   *
   * Unfollowing on this device removes its row immediately; this is for unfollowing somewhere else,
   * which this device only learns about when the account list is next reconciled.
   */
  retainSubscriptions: async (subscriptionKeys: readonly string[]): Promise<void> => {
    await initializeDatabase();

    const keep = new Set(subscriptionKeys);
    const rows = await getDb()
      .select({ subscriptionKey: schema.channelLiveStatus.subscriptionKey })
      .from(schema.channelLiveStatus);
    const drop = rows
      .map((row) => row.subscriptionKey)
      .filter((subscriptionKey) => !keep.has(subscriptionKey));

    for (const chunk of chunked(drop, DELETE_CHUNK_SIZE)) {
      await getDb()
        .delete(schema.channelLiveStatus)
        .where(inArray(schema.channelLiveStatus.subscriptionKey, chunk));
    }
  },

  clear: async (): Promise<void> => {
    await initializeDatabase();
    await getDb().delete(schema.channelLiveStatus);
  },
};
