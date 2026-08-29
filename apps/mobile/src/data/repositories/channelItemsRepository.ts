import { desc, eq, inArray, max, sql } from 'drizzle-orm';

import { articleStrippedTitle } from '@podverse/helpers';
import type { DTOItem } from '@podverse/helpers/dto';

// Import directly from the request module (not the auth barrel) to avoid a cycle, mirroring
// subscriptionsRepository (AuthProvider → accountRepository → auth barrel → AuthProvider).
import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { getDb, initializeDatabase, safeJsonParse, schema } from '../db';
import type { ChannelItemRow, ChannelItemWindowRow } from '../db/schema';
import type { ChannelItemRecord, ChannelItemWindow } from './channelItemWindow';
import {
  CHANNEL_ITEM_WINDOW_DEFAULT_DEPTH,
  clampChannelItemWindowDepth,
  extendChannelItemWindowDepth,
  isChannelItemWindowAtMaxDepth,
  isLastChannelItemPage,
  nextChannelItemPage,
  reconcileChannelItems,
  selectStaleChannelWindows,
  toChannelItemRecord,
} from './channelItemWindow';
import type { MobileAuthRequestContext } from './types';

/**
 * Items for the directory channels this device follows — the store that makes a subscription
 * browsable and playable with no connection.
 *
 * Reads never touch the network. Screens showing **subscribed** content go through here so they
 * behave identically offline; network search and directory browse stay separate, online-only
 * surfaces that do not read this store.
 *
 * Writes come from two places, and the difference is deliberate. Background reconciliation runs
 * through the serial sync queue, one channel at a time, because a pass over a whole subscription
 * list is exactly the work that must stay off the JS thread. Opening a channel refreshes it
 * directly, unqueued, because the person who opened it is waiting on the answer
 * (`mobile-sync-orchestration`).
 *
 * Add-by-RSS feeds are not stored here — see `addByRssRepository`, which keeps each feed whole.
 */

/** SQLite binds one parameter per column, so a bulk write has to arrive in pieces. */
const INSERT_CHUNK_SIZE = 100;
const DELETE_CHUNK_SIZE = 200;

/** One screenful of the cross-channel episode list, matching what the API returns per page. */
const RECENT_ITEM_LIMIT = 60;

/** How a stored episode list is ordered. Matches the sorts Home and podcast detail offer. */
export type ChannelItemSort = 'alphabetical' | 'recent';

/**
 * Order a stored page.
 *
 * Alphabetical is applied here rather than in SQL because the comparison ignores a leading article,
 * which SQLite cannot express without storing a second copy of every title.
 */
const sortItems = (items: DTOItem[], sort: ChannelItemSort): DTOItem[] => {
  return sort === 'alphabetical' ? [...items].sort(compareItemsByTitle) : items;
};

const compareItemsByTitle = (a: DTOItem, b: DTOItem): number => {
  return articleStrippedTitle(a.title ?? a.id_text).localeCompare(
    articleStrippedTitle(b.title ?? b.id_text)
  );
};

const chunked = <T>(values: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
};

const rowToItem = (row: Pick<ChannelItemRow, 'payloadJson'>): DTOItem | null => {
  return safeJsonParse<DTOItem>(row.payloadJson);
};

const rowsToItems = (rows: readonly Pick<ChannelItemRow, 'payloadJson'>[]): DTOItem[] => {
  const items: DTOItem[] = [];
  for (const row of rows) {
    const item = rowToItem(row);
    if (item !== null) {
      items.push(item);
    }
  }
  return items;
};

const windowRowToWindow = (row: ChannelItemWindowRow): ChannelItemWindow => {
  return {
    channelIdText: row.channelIdText,
    depth: clampChannelItemWindowDepth(row.depth),
    syncedAtMs: row.syncedAt,
  };
};

const readWindow = async (channelIdText: string): Promise<ChannelItemWindow> => {
  const rows = await getDb()
    .select()
    .from(schema.channelItemWindow)
    .where(eq(schema.channelItemWindow.channelIdText, channelIdText))
    .limit(1);

  const row = rows[0];
  if (row === undefined) {
    return { channelIdText, depth: CHANNEL_ITEM_WINDOW_DEFAULT_DEPTH, syncedAtMs: null };
  }
  return windowRowToWindow(row);
};

const writeWindow = async (channelIdText: string, depth: number, syncedAt: number) => {
  await getDb()
    .insert(schema.channelItemWindow)
    .values({ channelIdText, depth, syncedAt })
    .onConflictDoUpdate({
      target: schema.channelItemWindow.channelIdText,
      set: { depth, syncedAt },
    });
};

/**
 * Walk a channel's pages until the window is filled or the feed runs out.
 *
 * Runs to completion or throws. A partial walk is never returned, because committing one would
 * delete every item the pages that failed would have carried — the same reason the account's
 * directory walk is adopted whole or not at all.
 */
const fetchChannelItemWindow = async (
  context: MobileAuthRequestContext,
  channelIdText: string,
  depth: number
): Promise<{ isFeedExhausted: boolean; items: DTOItem[] }> => {
  const collected: DTOItem[] = [];
  let page = 1;

  for (;;) {
    const response = await requestWithMobileAuthRefresh(context, async (apiRequestService) =>
      apiRequestService.reqItemGetManyByChannel({
        idOrIdText: channelIdText,
        page,
        range: null,
        sort: 'recent',
      })
    );

    collected.push(...response.data);

    const pageShape = {
      lastPageCount: response.data.length,
      lastPageLimit: response.meta.limit,
    };

    const next = nextChannelItemPage({
      depth,
      fetchedCount: collected.length,
      lastPage: page,
      ...pageShape,
    });

    if (next === null) {
      return { isFeedExhausted: isLastChannelItemPage(pageShape), items: collected };
    }
    page = next;
  }
};

const commitChannelWindow = async (
  channelIdText: string,
  items: readonly DTOItem[],
  depth: number
): Promise<number> => {
  const records: ChannelItemRecord[] = [];
  for (const item of items) {
    const record = toChannelItemRecord(channelIdText, item);
    if (record !== null) {
      records.push(record);
    }
  }

  const stored = await getDb()
    .select({ itemIdText: schema.channelItem.itemIdText })
    .from(schema.channelItem)
    .where(eq(schema.channelItem.channelIdText, channelIdText));

  const { keep, removeIdTexts } = reconcileChannelItems({ depth, fetched: records, stored });

  for (const chunk of chunked(removeIdTexts, DELETE_CHUNK_SIZE)) {
    await getDb().delete(schema.channelItem).where(inArray(schema.channelItem.itemIdText, chunk));
  }

  const updatedAt = Date.now();
  for (const chunk of chunked(keep, INSERT_CHUNK_SIZE)) {
    await getDb()
      .insert(schema.channelItem)
      .values(
        chunk.map((record) => ({
          itemIdText: record.itemIdText,
          channelIdText: record.channelIdText,
          title: record.title,
          imageUrl: record.imageUrl,
          pubDateMs: record.pubDateMs,
          payloadJson: JSON.stringify(record.payload),
          updatedAt,
        }))
      )
      .onConflictDoUpdate({
        target: schema.channelItem.itemIdText,
        // Every row in the batch carries its own values, so the update has to read the row being
        // inserted rather than a single literal shared by all of them.
        set: {
          channelIdText: sql`excluded.channel_id_text`,
          title: sql`excluded.title`,
          imageUrl: sql`excluded.image_url`,
          pubDateMs: sql`excluded.pub_date_ms`,
          payloadJson: sql`excluded.payload_json`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }

  await writeWindow(channelIdText, depth, updatedAt);

  return keep.length;
};

export type ChannelWindowSyncResult = {
  /** The window this channel now stores. */
  depth: number;
  /**
   * Whether reaching further back would find anything. False once the feed is exhausted or the
   * per-channel ceiling is reached, which is what decides whether to offer "show more".
   */
  hasMore: boolean;
  storedCount: number;
};

const toSyncResult = (
  depth: number,
  isFeedExhausted: boolean,
  storedCount: number
): ChannelWindowSyncResult => {
  return {
    depth,
    hasMore: !isFeedExhausted && !isChannelItemWindowAtMaxDepth(depth),
    storedCount,
  };
};

export const channelItemsRepository = {
  /**
   * A channel's stored items, newest first unless asked otherwise. Offline-capable; never fetches.
   *
   * `sort` reorders the whole stored window rather than selecting a different set from it, so
   * choosing A-Z on a podcast shows the same episodes in a different order, not a different set of
   * episodes.
   */
  listByChannel: async (
    channelIdText: string,
    options: { sort?: ChannelItemSort } = {}
  ): Promise<DTOItem[]> => {
    await initializeDatabase();
    const rows = await getDb()
      .select({ payloadJson: schema.channelItem.payloadJson })
      .from(schema.channelItem)
      .where(eq(schema.channelItem.channelIdText, channelIdText))
      .orderBy(desc(schema.channelItem.pubDateMs));

    return sortItems(rowsToItems(rows), options.sort ?? 'recent');
  },

  /**
   * The newest stored items across every subscribed channel — Home's episode list, assembled from
   * what is on the device rather than from a server ranking, so it reads the same offline.
   *
   * Which episodes are in the list is always the recency window; `sort` only decides the order they
   * appear in. Ordering the whole stored corpus by title instead would answer "sort this list" by
   * replacing it with episodes from years ago.
   */
  listSubscribed: async (
    options: { limit?: number; sort?: ChannelItemSort } = {}
  ): Promise<DTOItem[]> => {
    await initializeDatabase();
    const { limit = RECENT_ITEM_LIMIT, sort = 'recent' } = options;

    const rows = await getDb()
      .select({ payloadJson: schema.channelItem.payloadJson })
      .from(schema.channelItem)
      .orderBy(desc(schema.channelItem.pubDateMs))
      .limit(limit);

    return sortItems(rowsToItems(rows), sort);
  },

  /** One stored item, for opening or playing an episode with no connection. */
  getByIdText: async (itemIdText: string): Promise<DTOItem | null> => {
    await initializeDatabase();
    const rows = await getDb()
      .select({ payloadJson: schema.channelItem.payloadJson })
      .from(schema.channelItem)
      .where(eq(schema.channelItem.itemIdText, itemIdText))
      .limit(1);

    const row = rows[0];
    return row === undefined ? null : rowToItem(row);
  },

  /**
   * When each stored channel last published, keyed by channel `id_text`.
   *
   * One grouped query rather than a lookup per channel, because the caller is ordering a whole
   * subscription list and would otherwise issue one round trip per row. Channels with nothing stored
   * are absent rather than zero, so the caller can tell "no episodes yet" from "published in 1970".
   */
  latestPubDateByChannel: async (): Promise<Map<string, number>> => {
    await initializeDatabase();
    const rows = await getDb()
      .select({
        channelIdText: schema.channelItem.channelIdText,
        latestPubDateMs: max(schema.channelItem.pubDateMs),
      })
      .from(schema.channelItem)
      .groupBy(schema.channelItem.channelIdText);

    const byChannel = new Map<string, number>();
    for (const row of rows) {
      if (typeof row.latestPubDateMs === 'number') {
        byChannel.set(row.channelIdText, row.latestPubDateMs);
      }
    }
    return byChannel;
  },

  getWindow: async (channelIdText: string): Promise<ChannelItemWindow> => {
    await initializeDatabase();
    return readWindow(channelIdText);
  },

  /**
   * The channels worth refreshing right now, deepest-window information included so the caller can
   * budget the work. Pass `staleAfterMs: 0` when somebody asked for it directly.
   */
  selectStaleChannels: async (
    channelIdTexts: readonly string[],
    options: { staleAfterMs?: number } = {}
  ): Promise<ChannelItemWindow[]> => {
    await initializeDatabase();
    if (channelIdTexts.length === 0) {
      return [];
    }

    const rows = await getDb().select().from(schema.channelItemWindow);
    const byChannel = new Map(rows.map((row) => [row.channelIdText, windowRowToWindow(row)]));

    const windows = channelIdTexts.map((channelIdText) => {
      return (
        byChannel.get(channelIdText) ?? {
          channelIdText,
          depth: CHANNEL_ITEM_WINDOW_DEFAULT_DEPTH,
          syncedAtMs: null,
        }
      );
    });

    return selectStaleChannelWindows({
      nowMs: Date.now(),
      staleAfterMs: options.staleAfterMs,
      windows,
    });
  },

  /**
   * Reconcile one channel against its feed at the depth it already stores.
   *
   * Idempotent: what the walk fetched replaces what was stored, so running it twice changes
   * nothing, an item pulled from the feed disappears, and new episodes push old ones out rather
   * than piling on top of them.
   */
  syncChannel: async (
    context: MobileAuthRequestContext,
    channelIdText: string
  ): Promise<ChannelWindowSyncResult> => {
    await initializeDatabase();
    const { depth } = await readWindow(channelIdText);
    const { isFeedExhausted, items } = await fetchChannelItemWindow(context, channelIdText, depth);
    const storedCount = await commitChannelWindow(channelIdText, items, depth);

    return toSyncResult(depth, isFeedExhausted, storedCount);
  },

  /**
   * Reach one step further back and keep it. Requires a connection by definition — offline, the
   * window stays exactly where it is and the caller keeps showing what is stored.
   */
  extendWindow: async (
    context: MobileAuthRequestContext,
    channelIdText: string
  ): Promise<ChannelWindowSyncResult> => {
    await initializeDatabase();
    const current = await readWindow(channelIdText);
    const depth = extendChannelItemWindowDepth(current.depth);
    const { isFeedExhausted, items } = await fetchChannelItemWindow(context, channelIdText, depth);
    const storedCount = await commitChannelWindow(channelIdText, items, depth);

    return toSyncResult(depth, isFeedExhausted, storedCount);
  },

  /** Forget a channel entirely, on unsubscribe. */
  removeChannel: async (channelIdText: string): Promise<void> => {
    await initializeDatabase();
    await getDb().delete(schema.channelItem).where(eq(schema.channelItem.channelIdText, channelIdText));
    await getDb()
      .delete(schema.channelItemWindow)
      .where(eq(schema.channelItemWindow.channelIdText, channelIdText));
  },

  /**
   * Keep only the channels still followed, so unsubscribing on another device — or browsing a
   * channel and never subscribing to it — cannot leave items behind forever.
   */
  retainChannels: async (channelIdTexts: readonly string[]): Promise<void> => {
    await initializeDatabase();

    if (channelIdTexts.length === 0) {
      await getDb().delete(schema.channelItem);
      await getDb().delete(schema.channelItemWindow);
      return;
    }

    // Diff in memory and delete what is left over, rather than asking SQLite to exclude the whole
    // followed list: a long subscription list would exceed its bind-parameter limit.
    const keep = new Set(channelIdTexts);
    const rows = await getDb()
      .selectDistinct({ channelIdText: schema.channelItemWindow.channelIdText })
      .from(schema.channelItemWindow);
    const drop = rows
      .map((row) => row.channelIdText)
      .filter((channelIdText) => !keep.has(channelIdText));

    for (const chunk of chunked(drop, DELETE_CHUNK_SIZE)) {
      await getDb().delete(schema.channelItem).where(inArray(schema.channelItem.channelIdText, chunk));
      await getDb()
        .delete(schema.channelItemWindow)
        .where(inArray(schema.channelItemWindow.channelIdText, chunk));
    }
  },

  /** Drop everything, for explicit resets: E2E fixtures and account deletion. */
  clear: async (): Promise<void> => {
    await initializeDatabase();
    await getDb().delete(schema.channelItem);
    await getDb().delete(schema.channelItemWindow);
  },
};
