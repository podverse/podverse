import { and, desc, eq, inArray, isNotNull, max, sql } from 'drizzle-orm';

import { articleStrippedTitle } from '@podverse/helpers';
import type { DTOItem } from '@podverse/helpers/dto';
import type { QueryParamsStatsRange } from '@podverse/helpers-requests';

// Import directly from the request module (not the auth barrel) to avoid a cycle, mirroring
// subscriptionsRepository (AuthProvider → accountRepository → auth barrel → AuthProvider).
import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { classifySyncError } from '../../sync/syncErrorClassification';
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
  selectChannelsToDropFromItemStore,
  selectKeptDownloadItemIds,
  selectStaleChannelWindows,
  toChannelItemRecord,
} from './channelItemWindow';
import { downloadsRepository } from './downloadsRepository';
import { sectionChromeFlagsRepository } from './sectionChromeFlagsRepository';
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

/** Window the stored listen-count ranks were stamped for. Null until a walk in this process. */
let appliedPopularityRange: QueryParamsStatsRange | null = null;

/** How a stored episode list is ordered. Matches the sorts Home and podcast detail offer. */
export type ChannelItemSort = 'alphabetical' | 'oldest' | 'popularity' | 'recent';

/** One stored item for Home's cross-channel list, with the channel id the row belongs to. */
export type SubscribedChannelItem = {
  channelIdText: string;
  item: DTOItem;
};

type ItemWithPopularity = {
  channelIdText: string;
  item: DTOItem;
  popularityRank: number | null;
};

/**
 * Order a stored page.
 *
 * Rows arrive newest first, so the oldest-first order is the same window read backwards rather than
 * a second query. Alphabetical is applied here rather than in SQL because the comparison ignores a
 * leading article, which SQLite cannot express without storing a second copy of every title.
 * Popularity uses the stored listen-count rank the same way, with unknown ranks after known ones.
 */
const toSubscribedChannelItem = (row: ItemWithPopularity): SubscribedChannelItem => ({
  channelIdText: row.channelIdText,
  item: row.item,
});

const sortItems = (items: readonly ItemWithPopularity[], sort: ChannelItemSort): DTOItem[] => {
  return sortSubscribedItems(items, sort).map((row) => row.item);
};

const sortSubscribedItems = (
  items: readonly ItemWithPopularity[],
  sort: ChannelItemSort
): SubscribedChannelItem[] => {
  if (sort === 'alphabetical') {
    return [...items]
      .sort((a, b) => compareItemsByTitle(a.item, b.item))
      .map(toSubscribedChannelItem);
  }
  if (sort === 'popularity') {
    return [...items].sort(compareItemsByPopularity).map(toSubscribedChannelItem);
  }
  const ordered = sort === 'oldest' ? [...items].reverse() : items;
  return ordered.map(toSubscribedChannelItem);
};

const compareItemsByPopularity = (a: ItemWithPopularity, b: ItemWithPopularity): number => {
  const aRank = a.popularityRank;
  const bRank = b.popularityRank;
  if (aRank === null && bRank === null) {
    return compareItemsByTitle(a.item, b.item);
  }
  if (aRank === null) {
    return 1;
  }
  if (bRank === null) {
    return -1;
  }
  if (aRank === bRank) {
    return compareItemsByTitle(a.item, b.item);
  }
  return aRank - bRank;
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

const completeDownloadIdsForItems = async (
  itemIdTexts: readonly string[]
): Promise<Set<string>> => {
  const complete = new Set<string>();
  for (const chunk of chunked(itemIdTexts, DELETE_CHUNK_SIZE)) {
    if (chunk.length === 0) {
      continue;
    }
    const rows = await getDb()
      .select({ itemIdText: schema.download.itemIdText })
      .from(schema.download)
      .where(
        and(eq(schema.download.status, 'complete'), inArray(schema.download.itemIdText, chunk))
      );
    for (const row of rows) {
      complete.add(row.itemIdText);
    }
  }
  return complete;
};

const rowToItem = (row: Pick<ChannelItemRow, 'payloadJson'>): DTOItem | null => {
  return safeJsonParse<DTOItem>(row.payloadJson);
};

const rowsToRankedItems = (
  rows: readonly Pick<ChannelItemRow, 'channelIdText' | 'payloadJson' | 'popularityRank'>[]
): ItemWithPopularity[] => {
  const items: ItemWithPopularity[] = [];
  for (const row of rows) {
    const item = rowToItem(row);
    if (item !== null) {
      items.push({
        channelIdText: row.channelIdText,
        item,
        popularityRank: row.popularityRank,
      });
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
  depth: number,
  isFeedExhausted: boolean,
  channelTitle: string | null = null
): Promise<number> => {
  const records: ChannelItemRecord[] = [];
  for (const item of items) {
    const record = toChannelItemRecord(channelIdText, item);
    if (record !== null) {
      records.push(record);
    }
  }

  const stored = await getDb()
    .select({
      itemIdText: schema.channelItem.itemIdText,
      keptForDownload: schema.channelItem.keptForDownload,
      pubDateMs: schema.channelItem.pubDateMs,
    })
    .from(schema.channelItem)
    .where(eq(schema.channelItem.channelIdText, channelIdText));

  const { keep, removeIdTexts } = reconcileChannelItems({ depth, fetched: records, stored });

  // A finished download whose episode left this walk stays on the show. The classification is
  // best-effort. When it fails, episodes with a complete download stay and the other remove ids
  // are deleted. When those download ids cannot be read, nothing from this walk is removed.
  let deleteIdTexts = removeIdTexts;
  if (removeIdTexts.length > 0) {
    let completeDownloadIds: Set<string> | null = null;
    try {
      const alreadyKeptIds = new Set(
        stored.filter((row) => row.keptForDownload === 1).map((row) => row.itemIdText)
      );
      completeDownloadIds = await completeDownloadIdsForItems(removeIdTexts);
      const retained = selectKeptDownloadItemIds({
        alreadyKeptIds,
        completeDownloadIds,
        isFeedExhausted,
        keep: keep.map((record) => ({
          itemIdText: record.itemIdText,
          pubDateMs: record.pubDateMs,
        })),
        stored,
      });
      const retainedIds = new Set(retained);
      deleteIdTexts = removeIdTexts.filter((itemIdText) => !retainedIds.has(itemIdText));
      for (const chunk of chunked(retained, DELETE_CHUNK_SIZE)) {
        if (chunk.length === 0) {
          continue;
        }
        await getDb()
          .update(schema.channelItem)
          .set({ keptForDownload: 1 })
          .where(inArray(schema.channelItem.itemIdText, chunk));
      }
    } catch (error) {
      console.warn(
        '[channel-items] keep downloaded episodes failed',
        classifySyncError(error).code
      );
      const knownComplete =
        completeDownloadIds ?? (await completeDownloadIdsForItems(removeIdTexts).catch(() => null));
      deleteIdTexts =
        knownComplete === null
          ? []
          : removeIdTexts.filter((itemIdText) => !knownComplete.has(itemIdText));
    }
  }

  for (const chunk of chunked(deleteIdTexts, DELETE_CHUNK_SIZE)) {
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
          keptForDownload: 0,
          updatedAt,
        }))
      )
      .onConflictDoUpdate({
        target: schema.channelItem.itemIdText,
        // Every row in the batch carries its own values, so the update has to read the row being
        // inserted rather than a single literal shared by all of them. kept_for_download is 0 for
        // every server row in the batch, including one that had been kept for a download.
        set: {
          channelIdText: sql`excluded.channel_id_text`,
          title: sql`excluded.title`,
          imageUrl: sql`excluded.image_url`,
          pubDateMs: sql`excluded.pub_date_ms`,
          payloadJson: sql`excluded.payload_json`,
          keptForDownload: 0,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }

  await writeWindow(channelIdText, depth, updatedAt);

  const hasOfficialClips = keep.some((record) => (record.payload.item_soundbites?.length ?? 0) > 0);
  await sectionChromeFlagsRepository.mergeChannel(channelIdText, { hasOfficialClips });

  // These rows are the only local answer to which show a downloaded episode came from, and this
  // store keeps only followed channels. Stamp the downloads while the answer is here.
  await downloadsRepository.attachChannelToDownloads({ channelIdText, channelTitle });

  void import('../nativeCache/carCacheReproject')
    .then(async ({ reprojectLibraryChildrenForChannel }) => {
      const { subscriptionsRepository } = await import('./subscriptionsRepository');
      const channel = await subscriptionsRepository.getByIdText(channelIdText);
      const mediumBucket = channel?.medium === 'music' ? 'music' : 'av';
      await reprojectLibraryChildrenForChannel(channelIdText, mediumBucket);
      if (mediumBucket === 'music') {
        const downloaded = await downloadsRepository.channelIdTextsWithCompleteDownloads();
        if (downloaded.includes(channelIdText)) {
          await downloadsRepository.reprojectNativeCache();
        }
      }
    })
    .catch(() => undefined);

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
      .select({
        channelIdText: schema.channelItem.channelIdText,
        payloadJson: schema.channelItem.payloadJson,
        popularityRank: schema.channelItem.popularityRank,
      })
      .from(schema.channelItem)
      .where(eq(schema.channelItem.channelIdText, channelIdText))
      .orderBy(desc(schema.channelItem.pubDateMs));

    return sortItems(rowsToRankedItems(rows), options.sort ?? 'recent');
  },

  /**
   * The newest stored items across every subscribed channel — Home's episode list, assembled from
   * what is on the device rather than from a server ranking, so it reads the same offline.
   *
   * Which episodes are in the list is always the recency window; `sort` only decides the order they
   * appear in. Ordering the whole stored corpus by title instead would answer "sort this list" by
   * replacing it with episodes from years ago.
   *
   * Pass `channelIdTexts` to restrict to a subset of followed channels (Home Tracks uses artist
   * and album follows only).
   */
  listSubscribed: async (
    options: {
      channelIdTexts?: readonly string[];
      limit?: number;
      sort?: ChannelItemSort;
    } = {}
  ): Promise<SubscribedChannelItem[]> => {
    await initializeDatabase();
    const { channelIdTexts, limit = RECENT_ITEM_LIMIT, sort = 'recent' } = options;

    if (channelIdTexts !== undefined && channelIdTexts.length === 0) {
      return [];
    }

    const baseQuery = getDb()
      .select({
        channelIdText: schema.channelItem.channelIdText,
        payloadJson: schema.channelItem.payloadJson,
        popularityRank: schema.channelItem.popularityRank,
      })
      .from(schema.channelItem);

    const rows =
      channelIdTexts === undefined
        ? await baseQuery.orderBy(desc(schema.channelItem.pubDateMs)).limit(limit)
        : await baseQuery
            .where(inArray(schema.channelItem.channelIdText, [...channelIdTexts]))
            .orderBy(desc(schema.channelItem.pubDateMs))
            .limit(limit);

    return sortSubscribedItems(rowsToRankedItems(rows), sort);
  },

  /**
   * Whether any stored episode already has a listen-count rank for this window.
   *
   * A range that differs from the last walk is treated as missing so Home can stamp the new
   * window instead of reordering from ranks that belong to another one.
   */
  hasPopularityRanks: async (range?: QueryParamsStatsRange): Promise<boolean> => {
    if (range !== undefined && appliedPopularityRange !== range) {
      return false;
    }
    await initializeDatabase();
    const rows = await getDb()
      .select({ itemIdText: schema.channelItem.itemIdText })
      .from(schema.channelItem)
      .where(isNotNull(schema.channelItem.popularityRank))
      .limit(1);
    return rows.length > 0;
  },

  /**
   * Stamp listen-count ranks from one page of the account's subscribed popularity list.
   *
   * Home's episode list is a recency window reordered by these ranks, so a single popular page is
   * enough: episodes outside that page stay unranked and sort after the ones that have a rank.
   */
  refreshPopularityRanks: async (
    context: MobileAuthRequestContext,
    range: QueryParamsStatsRange = 'week'
  ): Promise<void> => {
    const response = await requestWithMobileAuthRefresh(context, async (apiRequestService) =>
      apiRequestService.reqItemGetMany({
        category: null,
        medium: 'podcasts',
        page: 1,
        range,
        sort: 'top',
        type: 'subscribed',
      })
    );

    await initializeDatabase();
    await getDb().transaction(async (transaction) => {
      await transaction.update(schema.channelItem).set({ popularityRank: null });
      for (const [index, item] of response.data.entries()) {
        const itemIdText = item.id_text.trim();
        if (itemIdText.length === 0) {
          continue;
        }
        await transaction
          .update(schema.channelItem)
          .set({ popularityRank: index })
          .where(eq(schema.channelItem.itemIdText, itemIdText));
      }
    });
    appliedPopularityRange = range;
  },

  /** The channel a stored item belongs to, when the item payload itself omitted `channel`. */
  getChannelIdForItem: async (itemIdText: string): Promise<string | null> => {
    await initializeDatabase();
    const rows = await getDb()
      .select({ channelIdText: schema.channelItem.channelIdText })
      .from(schema.channelItem)
      .where(eq(schema.channelItem.itemIdText, itemIdText))
      .limit(1);
    return rows[0]?.channelIdText ?? null;
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
   * Replace the payload of an item this device already stores.
   *
   * Browse and search items are not inserted here — this store is for followed channels. A
   * cache-first episode screen calls this after a server copy arrives so the next open is current.
   * A single-item copy has no channel-wide publishers, so the stored ones are kept. Writing the
   * payload clears `kept_for_download`, because the server lists the episode again. The download
   * row stays.
   */
  updateStoredItem: async (item: DTOItem): Promise<void> => {
    const itemIdText = item.id_text.trim();
    if (itemIdText.length === 0) {
      return;
    }

    await initializeDatabase();
    const existing = await getDb()
      .select({
        channelIdText: schema.channelItem.channelIdText,
        payloadJson: schema.channelItem.payloadJson,
      })
      .from(schema.channelItem)
      .where(eq(schema.channelItem.itemIdText, itemIdText))
      .limit(1);
    const current = existing[0];
    if (current === undefined) {
      return;
    }

    const storedChannelWide = rowToItem(current)?.channel_wide_verified_publishers;
    const next: DTOItem =
      item.channel_wide_verified_publishers === undefined && storedChannelWide !== undefined
        ? { ...item, channel_wide_verified_publishers: storedChannelWide }
        : item;
    const record = toChannelItemRecord(current.channelIdText, next);
    if (record === null) {
      return;
    }

    await getDb()
      .update(schema.channelItem)
      .set({
        title: record.title,
        imageUrl: record.imageUrl,
        pubDateMs: record.pubDateMs,
        payloadJson: JSON.stringify(record.payload),
        keptForDownload: 0,
        updatedAt: Date.now(),
      })
      .where(eq(schema.channelItem.itemIdText, itemIdText));
  },

  /**
   * Store an episode the server did not return in this channel's window, so a finished download
   * can stay on the show and play. A row the server already lists is left as that server row.
   * This does not subscribe the channel, create an Add by RSS feed, or write a download.
   */
  keepDownloadedItem: async (params: {
    channelIdText: string;
    item: DTOItem;
  }): Promise<'kept' | 'server_listed' | 'skipped'> => {
    const itemIdText = params.item.id_text.trim();
    if (itemIdText.length === 0) {
      return 'skipped';
    }
    const record = toChannelItemRecord(params.channelIdText, params.item);
    if (record === null) {
      return 'skipped';
    }

    await initializeDatabase();
    const existing = await getDb()
      .select({ keptForDownload: schema.channelItem.keptForDownload })
      .from(schema.channelItem)
      .where(eq(schema.channelItem.itemIdText, record.itemIdText))
      .limit(1);
    const current = existing[0];
    if (current !== undefined && current.keptForDownload === 0) {
      return 'server_listed';
    }

    const updatedAt = Date.now();
    await getDb()
      .insert(schema.channelItem)
      .values({
        itemIdText: record.itemIdText,
        channelIdText: record.channelIdText,
        title: record.title,
        imageUrl: record.imageUrl,
        pubDateMs: record.pubDateMs,
        payloadJson: JSON.stringify(record.payload),
        keptForDownload: 1,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: schema.channelItem.itemIdText,
        set: {
          title: record.title,
          imageUrl: record.imageUrl,
          pubDateMs: record.pubDateMs,
          payloadJson: JSON.stringify(record.payload),
          keptForDownload: 1,
          updatedAt,
        },
      });
    return 'kept';
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
   * What the walk fetched replaces the stored server rows, so running it twice changes nothing
   * and new episodes push old ones past the window. A finished download whose episode left the
   * feed stays on the show. An episode pushed past the window leaves the list; its download
   * row stays.
   */
  syncChannel: async (
    context: MobileAuthRequestContext,
    channelIdText: string,
    options: { channelTitle?: string | null } = {}
  ): Promise<ChannelWindowSyncResult> => {
    await initializeDatabase();
    const { depth } = await readWindow(channelIdText);
    const { isFeedExhausted, items } = await fetchChannelItemWindow(context, channelIdText, depth);
    const storedCount = await commitChannelWindow(
      channelIdText,
      items,
      depth,
      isFeedExhausted,
      options.channelTitle ?? null
    );

    return toSyncResult(depth, isFeedExhausted, storedCount);
  },

  /**
   * Reach one step further back and keep it. Requires a connection by definition — offline, the
   * window stays exactly where it is and the caller keeps showing what is stored.
   */
  extendWindow: async (
    context: MobileAuthRequestContext,
    channelIdText: string,
    options: { channelTitle?: string | null } = {}
  ): Promise<ChannelWindowSyncResult> => {
    await initializeDatabase();
    const current = await readWindow(channelIdText);
    const depth = extendChannelItemWindowDepth(current.depth);
    const { isFeedExhausted, items } = await fetchChannelItemWindow(context, channelIdText, depth);
    const storedCount = await commitChannelWindow(
      channelIdText,
      items,
      depth,
      isFeedExhausted,
      options.channelTitle ?? null
    );

    return toSyncResult(depth, isFeedExhausted, storedCount);
  },

  /** Forget a channel entirely, on unsubscribe. */
  removeChannel: async (channelIdText: string): Promise<void> => {
    await initializeDatabase();
    // Unfollowing does not delete files, so the downloads left behind keep their own record of
    // which show they came from.
    await downloadsRepository.attachChannelToDownloads({ channelIdText });
    await getDb()
      .delete(schema.channelItem)
      .where(eq(schema.channelItem.channelIdText, channelIdText));
    await getDb()
      .delete(schema.channelItemWindow)
      .where(eq(schema.channelItemWindow.channelIdText, channelIdText));
    await downloadsRepository.reprojectNativeCache();
  },

  /**
   * Keep the channels still followed and the channels holding a finished download, so unsubscribing
   * on another device — or browsing a channel and never subscribing to it — cannot leave items
   * behind forever, while a downloaded episode keeps the stored feed data it needs offline. The
   * car downloads index is rebuilt because its artist names depend on which channels are followed.
   */
  retainChannels: async (channelIdTexts: readonly string[]): Promise<void> => {
    await initializeDatabase();

    // Diff in memory and delete what is left over, rather than asking SQLite to exclude the whole
    // followed list: a long subscription list would exceed its bind-parameter limit.
    const rows = await getDb()
      .selectDistinct({ channelIdText: schema.channelItemWindow.channelIdText })
      .from(schema.channelItemWindow);
    const stored = rows.map((row) => row.channelIdText);

    // A download has to be able to name its show without this store. Stamp before anything is
    // deleted, so a channel that was only ever browsed still leaves its downloads attributable —
    // and so the check below can see them.
    const followed = new Set(channelIdTexts);
    for (const channelIdText of stored) {
      if (!followed.has(channelIdText)) {
        await downloadsRepository.attachChannelToDownloads({ channelIdText });
      }
    }

    const downloaded = await downloadsRepository.channelIdTextsWithCompleteDownloads();
    if (channelIdTexts.length === 0 && downloaded.length === 0) {
      await getDb().delete(schema.channelItem);
      await getDb().delete(schema.channelItemWindow);
      await downloadsRepository.reprojectNativeCache();
      return;
    }

    const drop = selectChannelsToDropFromItemStore({
      downloaded,
      followed: channelIdTexts,
      stored,
    });

    for (const chunk of chunked(drop, DELETE_CHUNK_SIZE)) {
      await getDb()
        .delete(schema.channelItem)
        .where(inArray(schema.channelItem.channelIdText, chunk));
      await getDb()
        .delete(schema.channelItemWindow)
        .where(inArray(schema.channelItemWindow.channelIdText, chunk));
    }
    await downloadsRepository.reprojectNativeCache();
  },

  /** Drop everything, for explicit resets: E2E fixtures and account deletion. */
  clear: async (): Promise<void> => {
    await initializeDatabase();
    await getDb().delete(schema.channelItem);
    await getDb().delete(schema.channelItemWindow);
  },
};
