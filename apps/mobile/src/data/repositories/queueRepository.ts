import { eq, like } from 'drizzle-orm';

import { getAddByRSSHashId } from '@podverse/helpers';
import type {
  DTOQueue,
  DTOQueueResource,
  DTOQueueResourceAbridgedResponseData,
  QueueExtraParams,
} from '@podverse/helpers/dto';
import { isMusicMediumId } from '@podverse/helpers/medium';
import { queueResourceContentId } from '@podverse/playback-core';

// Import from the request module (not the auth barrel) to keep the React AuthProvider out of the
// data-layer module graph.
import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { withCanonicalAddByRssFeedUrl } from '../../lib/addByRss/resourceData';
import { publishQueueDataChanged } from '../../sync/queueDataRevision';
import { getDb, initializeDatabase, safeJsonParse, schema } from '../db';
import type { NativeCacheQueueEntry } from '../nativeCache';
import { projectQueueSnapshotToNativeCache } from '../nativeCache';
import { nativeQueueEntryFromQueueResource } from '../nativeCache/queueEntryMapping';
import {
  publishQueueCompletionFromAbridged,
  resetQueueCompletionStore,
  setQueueCompletionOverride,
} from '../queueCompletionStore';
import { readThroughOrFetch, shouldSkipOpportunisticRemoteFetch } from '../sync';
import { nativeAdvanceSourceRepository } from './nativeAdvanceSourceRepository';
import type { MobileAuthRequestContext } from './types';

const QUEUE_TTL_MS = 5 * 60 * 1000;

/**
 * Advances when queue data is cleared. A response that started under an older generation belongs
 * to a session that has ended, so its write is dropped.
 */
let queueCacheGeneration = 0;

const CACHE_KEY_QUEUES = 'queues';
const CACHE_KEY_ABRIDGED_INDEX = 'queue-resources-abridged';
const nowPlayingCacheKey = (queueIdText: string): string => `now-playing:${queueIdText}`;
const upcomingCacheKey = (queueIdText: string): string => `upcoming:${queueIdText}`;
const historyCacheKey = (queueIdText: string, page: number): string =>
  `history:${queueIdText}:${page}`;

type QueueCacheHit<T> = {
  value: T;
  updatedAt: number;
};

const readQueueCache = async <T>(cacheKey: string): Promise<QueueCacheHit<T> | null> => {
  await initializeDatabase();
  const rows = await getDb()
    .select({ payloadJson: schema.queueCache.payloadJson, updatedAt: schema.queueCache.updatedAt })
    .from(schema.queueCache)
    .where(eq(schema.queueCache.cacheKey, cacheKey))
    .limit(1);

  const row = rows[0];
  if (row === undefined) {
    return null;
  }

  const value = safeJsonParse<T>(row.payloadJson);
  return value === null ? null : { value, updatedAt: row.updatedAt };
};

const writeQueueCache = async (
  cacheKey: string,
  value: unknown,
  generation: number
): Promise<void> => {
  if (generation !== queueCacheGeneration) {
    return;
  }
  await initializeDatabase();
  const updatedAt = Date.now();
  const payloadJson = JSON.stringify(value);
  await getDb()
    .insert(schema.queueCache)
    .values({ cacheKey, payloadJson, updatedAt })
    .onConflictDoUpdate({
      target: schema.queueCache.cacheKey,
      set: { payloadJson, updatedAt },
    });
};

const deleteQueueCache = async (cacheKey: string): Promise<void> => {
  await initializeDatabase();
  await getDb().delete(schema.queueCache).where(eq(schema.queueCache.cacheKey, cacheKey));
};

const deleteQueueCacheByPrefix = async (cacheKeyPrefix: string): Promise<void> => {
  await initializeDatabase();
  await getDb()
    .delete(schema.queueCache)
    .where(like(schema.queueCache.cacheKey, `${cacheKeyPrefix}%`));
};

const isCacheStale = (hit: QueueCacheHit<unknown> | null): boolean => {
  if (hit === null) {
    return true;
  }

  return Date.now() - hit.updatedAt > QUEUE_TTL_MS;
};

/** Active queue if present, else the first queue (mirrors web primary-queue selection). */
export const selectPrimaryQueue = (queues: DTOQueue[]): DTOQueue | null => {
  const activeQueue = queues.find((queue) => queue.is_active_queue);
  if (activeQueue) {
    return activeQueue;
  }

  return queues[0] ?? null;
};

/**
 * Project the current now-playing + upcoming snapshot to the native cache. Repositories call this
 * after every successful queue sync/mutation — CarPlay / Android Auto / watch complications read
 * this native cache, never SQLite (see DOCS-MOBILE-DATA-LAYER-OFFLINE.md §7.1).
 */
const mediumBucketForQueueId = async (queueIdText: string): Promise<'av' | 'music'> => {
  const queues = (await readQueueCache<DTOQueue[]>(CACHE_KEY_QUEUES))?.value ?? [];
  const match = queues.find((queue) => queue.id_text === queueIdText);
  return isMusicMediumId(match?.medium_id) ? 'music' : 'av';
};

const projectQueueForQueue = async (queueIdText: string): Promise<void> => {
  const nowPlaying =
    (await readQueueCache<DTOQueueResource>(nowPlayingCacheKey(queueIdText)))?.value ?? null;
  const upcoming =
    (await readQueueCache<DTOQueueResource[]>(upcomingCacheKey(queueIdText)))?.value ?? [];

  const entries: NativeCacheQueueEntry[] = [];
  if (nowPlaying !== null) {
    const nowPlayingEntry = nativeQueueEntryFromQueueResource(nowPlaying);
    if (nowPlayingEntry !== null) {
      entries.push(nowPlayingEntry);
    }
  }
  for (const resource of upcoming) {
    const entry = nativeQueueEntryFromQueueResource(resource);
    if (entry !== null && entry.idText !== nowPlaying?.item?.id_text) {
      entries.push(entry);
    }
  }

  const mediumBucket = await mediumBucketForQueueId(queueIdText);
  await projectQueueSnapshotToNativeCache({
    nowPlayingIdText: nowPlaying?.item?.id_text ?? null,
    entries,
    mediumBucket,
  });

  // The car's Recent list is the podcast queue's history; a Music queue write must not replace it.
  if (mediumBucket !== 'av') {
    return;
  }
  try {
    const { reprojectHistoryIndex } = await import('../nativeCache/carCacheReproject');
    await reprojectHistoryIndex(queueIdText);
  } catch {
    // Soft-fail history projection.
  }
};

/** Skip the car snapshot when the session that started this read has already ended. */
const projectQueueIfCurrent = async (queueIdText: string, generation: number): Promise<void> => {
  if (generation !== queueCacheGeneration) {
    return;
  }
  await projectQueueForQueue(queueIdText);
};

/**
 * Force-refresh now-playing from the server after a mutation and reconcile the SQLite cache
 * (write when present, delete when the server reports no now-playing). Returns the fresh value.
 */
const forceRefreshNowPlaying = async (
  context: MobileAuthRequestContext,
  queueIdText: string,
  generation: number
): Promise<DTOQueueResource | null> => {
  const cacheKey = nowPlayingCacheKey(queueIdText);
  const fetched = await requestWithMobileAuthRefresh(context, async (api) =>
    api.reqQueueResourcesGetNowPlayingByQueueIdText(queueIdText)
  );
  if (fetched === null) {
    await deleteQueueCache(cacheKey);
  } else {
    await writeQueueCache(cacheKey, fetched, generation);
  }
  return fetched;
};

/**
 * Force-refresh the account's queue list and rewrite the SQLite cache. Which queue is active — and
 * whether a queue exists at all — changes as playback runs, and every screen that reads history,
 * now-playing, or upcoming picks its queue from this list, so a mutation that can move the active
 * flag has to rewrite it rather than wait out the read-through TTL.
 */
const forceRefreshQueues = async (
  context: MobileAuthRequestContext,
  generation: number
): Promise<DTOQueue[]> => {
  const fetched = await requestWithMobileAuthRefresh(context, async (api) =>
    api.reqQueueGetAllForAccountPrivate()
  );
  await writeQueueCache(CACHE_KEY_QUEUES, fetched, generation);
  return fetched;
};

/** Force-refresh upcoming from the server after a mutation and rewrite the SQLite cache. */
const forceRefreshUpcoming = async (
  context: MobileAuthRequestContext,
  queueIdText: string,
  generation: number
): Promise<DTOQueueResource[]> => {
  const fetched = await requestWithMobileAuthRefresh(context, async (api) =>
    api.reqQueueResourcesGetAllUpcomingByQueueIdText(queueIdText)
  );
  await writeQueueCache(upcomingCacheKey(queueIdText), fetched, generation);
  return fetched;
};

/** Force-refresh paginated history from the server and rewrite the page cache key. */
const forceRefreshHistoryPage = async (
  context: MobileAuthRequestContext,
  queueIdText: string,
  page: number,
  generation: number
): Promise<DTOQueueResource[]> => {
  const response = await requestWithMobileAuthRefresh(context, async (api) =>
    api.reqQueueResourcesGetHistoryByQueueIdTextPaginated(queueIdText, page)
  );
  await writeQueueCache(historyCacheKey(queueIdText, page), response.data, generation);
  return response.data;
};

const toBetweenParams = (
  position1: number,
  position2: number
): { position1: string; position2: string } => {
  return {
    position1: String(position1),
    position2: String(position2),
  };
};

const refreshQueueSnapshotAfterMutation = async (
  context: MobileAuthRequestContext,
  queueIdText: string,
  generation: number
): Promise<{ nowPlaying: DTOQueueResource | null; upcoming: DTOQueueResource[] }> => {
  const [nowPlaying, upcoming] = await Promise.all([
    forceRefreshNowPlaying(context, queueIdText, generation),
    forceRefreshUpcoming(context, queueIdText, generation),
  ]);
  await projectQueueIfCurrent(queueIdText, generation);
  return { nowPlaying, upcoming };
};

/**
 * After a queue write, drop cached history pages and refresh now-playing plus upcoming before
 * telling open screens. A row has one list position, so history must not keep a copy the queue
 * just claimed, and the History screen drops it as soon as this publish lands.
 */
const refreshQueueViewsAfterMutation = async (
  context: MobileAuthRequestContext,
  queueIdText: string,
  generation: number
): Promise<{ nowPlaying: DTOQueueResource | null; upcoming: DTOQueueResource[] }> => {
  await deleteQueueCacheByPrefix(`history:${queueIdText}:`);
  const snapshot = await refreshQueueSnapshotAfterMutation(context, queueIdText, generation);
  publishQueueDataChanged();
  return snapshot;
};

/**
 * A now-playing resource targeted by a move-to-history mutation. Mirrors the web
 * `useQueueResourcesMoveNowPlayingToHistory` clip / soundbite / item / Add by RSS branches. An Add
 * by RSS resource is identified by its resource data; the server derives the hash from it.
 */
export type MoveNowPlayingToHistoryTarget = (
  | { kind: 'item' | 'clip' | 'soundbite'; idText: string }
  | { kind: 'add_by_rss'; resourceData: object }
) & {
  playbackPosition?: string;
  completed?: boolean;
};

/**
 * Write a resource into the queue's history, then bring every cache that describes the queue back
 * in line: history pages, now-playing, upcoming, and the native-cache projection. Adding to history
 * also takes the resource out of upcoming, so a partial refresh would leave the list lying.
 */
const addResourceToHistory = async (
  context: MobileAuthRequestContext,
  queueIdText: string,
  target: MoveNowPlayingToHistoryTarget
): Promise<{ nowPlaying: DTOQueueResource | null; upcoming: DTOQueueResource[] }> => {
  const generation = queueCacheGeneration;
  const params: QueueExtraParams = {
    ...(target.playbackPosition !== undefined
      ? { playback_position: target.playbackPosition }
      : {}),
    ...(target.completed !== undefined ? { completed: target.completed } : {}),
  };

  await requestWithMobileAuthRefresh(context, async (api) => {
    if (target.kind === 'add_by_rss') {
      return api.reqQueueResourceItemAddByRSSAddHistory(queueIdText, {
        ...params,
        add_by_rss_resource_data: withCanonicalAddByRssFeedUrl(target.resourceData),
      });
    }
    if (target.kind === 'clip') {
      return api.reqQueueResourceClipAddHistory(queueIdText, target.idText, params);
    }
    if (target.kind === 'soundbite') {
      return api.reqQueueResourceItemSoundbiteAddHistory(queueIdText, target.idText, params);
    }
    return api.reqQueueResourceItemAddHistory(queueIdText, target.idText, params);
  });

  if (target.completed === true || target.completed === false) {
    const idText =
      target.kind === 'add_by_rss'
        ? getAddByRSSHashId(withCanonicalAddByRssFeedUrl(target.resourceData))
        : target.idText;
    setQueueCompletionOverride(target.kind, idText, target.completed);
  }

  return refreshQueueViewsAfterMutation(context, queueIdText, generation);
};

const HISTORY_LIST_POSITION_STEP = 0.00000001;

const historyListPosition = (index: number): string =>
  (-(index + 1) * HISTORY_LIST_POSITION_STEP).toFixed(8);

export type QueueResourceZone = 'history' | 'now-playing' | 'upcoming-front';

/**
 * Posts one zone move and leaves the local cache alone. A burst of skips writes the cache itself
 * and must not reload the queue between taps.
 */
const postQueueResourceZone = async (
  context: MobileAuthRequestContext,
  queueIdText: string,
  zone: QueueResourceZone,
  resource: DTOQueueResource,
  params: QueueExtraParams
): Promise<void> => {
  const clipId = resource.clip?.id_text;
  const soundbiteId = resource.item_soundbite?.id_text;
  const itemId = resource.item?.id_text;
  const addByRss = resource.add_by_rss_resource_data;
  await requestWithMobileAuthRefresh(context, async (api) => {
    if (typeof clipId === 'string' && clipId.length > 0) {
      if (zone === 'history') {
        return api.reqQueueResourceClipAddHistory(queueIdText, clipId, params);
      }
      if (zone === 'now-playing') {
        return api.reqQueueResourceClipAddNowPlaying(queueIdText, clipId, params);
      }
      return api.reqQueueResourceClipAddNext(queueIdText, clipId);
    }
    if (typeof soundbiteId === 'string' && soundbiteId.length > 0) {
      if (zone === 'history') {
        return api.reqQueueResourceItemSoundbiteAddHistory(queueIdText, soundbiteId, params);
      }
      if (zone === 'now-playing') {
        return api.reqQueueResourceItemSoundbiteAddNowPlaying(queueIdText, soundbiteId, params);
      }
      return api.reqQueueResourceItemSoundbiteAddNext(queueIdText, soundbiteId);
    }
    if (
      (typeof itemId !== 'string' || itemId.length === 0) &&
      addByRss !== null &&
      addByRss !== undefined
    ) {
      const resourceData = withCanonicalAddByRssFeedUrl(addByRss);
      if (zone === 'history') {
        return api.reqQueueResourceItemAddByRSSAddHistory(queueIdText, {
          ...params,
          add_by_rss_resource_data: resourceData,
        });
      }
      if (zone === 'now-playing') {
        return api.reqQueueResourceItemAddByRSSAddNowPlaying(queueIdText, {
          ...params,
          add_by_rss_resource_data: resourceData,
        });
      }
      return api.reqQueueResourceItemAddByRSSAddNext(queueIdText, {
        add_by_rss_resource_data: resourceData,
      });
    }
    if (typeof itemId !== 'string' || itemId.length === 0) {
      return undefined;
    }
    if (zone === 'history') {
      return api.reqQueueResourceItemAddHistory(queueIdText, itemId, params);
    }
    if (zone === 'now-playing') {
      return api.reqQueueResourceItemAddNowPlaying(queueIdText, itemId, params);
    }
    return api.reqQueueResourceItemAddNext(queueIdText, itemId);
  });
};

/**
 * Queue / now-playing / upcoming / history repository. Reads SQLite first (offline-first); a
 * missing/stale cache triggers a background sync via the queue `req*` wrappers, which live here —
 * not in screens/hooks. DTO shapes match web (`@podverse/helpers/dto`). Mutations write to the
 * server, force-refresh the affected SQLite caches, then project the snapshot to the native cache.
 */
export const queueRepository = {
  /**
   * All queues for the account (offline-first read-through). Mirrors the web bootstrap
   * `reqQueueGetAllForAccountPrivate` load; the queue store / load-active hook select the active
   * queue from this list (never call `req*` from screens).
   */
  getQueues: async (context: MobileAuthRequestContext): Promise<DTOQueue[]> => {
    const generation = queueCacheGeneration;
    const queues = await readThroughOrFetch<DTOQueue[]>({
      readLocal: async () => (await readQueueCache<DTOQueue[]>(CACHE_KEY_QUEUES))?.value ?? null,
      isStale: async () => isCacheStale(await readQueueCache<DTOQueue[]>(CACHE_KEY_QUEUES)),
      fetchRemote: async () => {
        const fetched = await requestWithMobileAuthRefresh(context, async (api) =>
          api.reqQueueGetAllForAccountPrivate()
        );
        await writeQueueCache(CACHE_KEY_QUEUES, fetched, generation);
        return fetched;
      },
    });

    return queues ?? [];
  },

  getPrimaryQueue: async (context: MobileAuthRequestContext): Promise<DTOQueue | null> => {
    return selectPrimaryQueue(await queueRepository.getQueues(context));
  },

  /**
   * Abridged queue-resource index across all queues (web SSR bootstrap parity). Cached in SQLite so
   * a cold start can render the last snapshot offline while a background sync refreshes.
   */
  getAbridgedIndex: async (
    context: MobileAuthRequestContext
  ): Promise<DTOQueueResourceAbridgedResponseData[]> => {
    const generation = queueCacheGeneration;
    const abridged = await readThroughOrFetch<DTOQueueResourceAbridgedResponseData[]>({
      readLocal: async () =>
        (await readQueueCache<DTOQueueResourceAbridgedResponseData[]>(CACHE_KEY_ABRIDGED_INDEX))
          ?.value ?? null,
      isStale: async () =>
        isCacheStale(
          await readQueueCache<DTOQueueResourceAbridgedResponseData[]>(CACHE_KEY_ABRIDGED_INDEX)
        ),
      fetchRemote: async () => {
        const fetched = await requestWithMobileAuthRefresh(context, async (api) =>
          api.reqQueueResourcesGetAllByAccountAbridged()
        );
        await writeQueueCache(CACHE_KEY_ABRIDGED_INDEX, fetched, generation);
        return fetched;
      },
    });

    const rows = abridged ?? [];
    publishQueueCompletionFromAbridged(rows);
    return rows;
  },

  getNowPlaying: async (
    context: MobileAuthRequestContext,
    queueIdText: string,
    options?: { skipCache?: boolean }
  ): Promise<DTOQueueResource | null> => {
    const generation = queueCacheGeneration;
    const cacheKey = nowPlayingCacheKey(queueIdText);
    const hit = await readQueueCache<DTOQueueResource>(cacheKey);

    const fetchRemote = async (): Promise<DTOQueueResource | null> => {
      const fetched = await requestWithMobileAuthRefresh(context, async (api) =>
        api.reqQueueResourcesGetNowPlayingByQueueIdText(queueIdText)
      );
      if (fetched !== null) {
        await writeQueueCache(cacheKey, fetched, generation);
      }
      await projectQueueIfCurrent(queueIdText, generation);
      return fetched;
    };

    if (options?.skipCache === true) {
      try {
        return await fetchRemote();
      } catch (error) {
        if (__DEV__) {
          console.warn('[queue] now-playing skip-cache fetch failed', error);
        }
        return hit?.value ?? null;
      }
    }

    // now-playing can legitimately be null, so this can't use readThroughOrFetch (null = miss).
    if (hit === null) {
      if (shouldSkipOpportunisticRemoteFetch()) {
        return null;
      }
      try {
        return await fetchRemote();
      } catch (error) {
        if (__DEV__) {
          console.warn('[queue] now-playing fetch failed with empty cache', error);
        }
        return null;
      }
    }

    if (!shouldSkipOpportunisticRemoteFetch() && isCacheStale(hit)) {
      void fetchRemote().catch((error) => {
        if (__DEV__) {
          console.warn('[queue] now-playing background refresh failed', error);
        }
      });
    }

    return hit.value;
  },

  /**
   * When the queue has no now-playing row, move the first upcoming row to position 0 without
   * recording a listen. Refreshes now-playing + upcoming caches and projects the native snapshot.
   * Returns the resulting now-playing resource, or null when the queue is empty.
   */
  promoteFirstUpcomingToNowPlaying: async (
    context: MobileAuthRequestContext,
    queueIdText: string
  ): Promise<DTOQueueResource | null> => {
    const generation = queueCacheGeneration;
    const promoted = await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqQueueResourcesPromoteUpcomingToNowPlaying(queueIdText)
    );
    await refreshQueueViewsAfterMutation(context, queueIdText, generation);
    return promoted;
  },

  getUpcoming: async (
    context: MobileAuthRequestContext,
    queueIdText: string
  ): Promise<DTOQueueResource[]> => {
    const cacheKey = upcomingCacheKey(queueIdText);
    const generation = queueCacheGeneration;
    const upcoming = await readThroughOrFetch<DTOQueueResource[]>({
      readLocal: async () => (await readQueueCache<DTOQueueResource[]>(cacheKey))?.value ?? null,
      isStale: async () => isCacheStale(await readQueueCache<DTOQueueResource[]>(cacheKey)),
      fetchRemote: async () => {
        const fetched = await requestWithMobileAuthRefresh(context, async (api) =>
          api.reqQueueResourcesGetAllUpcomingByQueueIdText(queueIdText)
        );
        await writeQueueCache(cacheKey, fetched, generation);
        await projectQueueIfCurrent(queueIdText, generation);
        return fetched;
      },
    });

    return upcoming ?? [];
  },

  getHistoryPage: async (
    context: MobileAuthRequestContext,
    queueIdText: string,
    page: number
  ): Promise<DTOQueueResource[]> => {
    const cacheKey = historyCacheKey(queueIdText, page);
    const generation = queueCacheGeneration;
    const history = await readThroughOrFetch<DTOQueueResource[]>({
      readLocal: async () => (await readQueueCache<DTOQueueResource[]>(cacheKey))?.value ?? null,
      isStale: async () => isCacheStale(await readQueueCache<DTOQueueResource[]>(cacheKey)),
      fetchRemote: async () => {
        const response = await requestWithMobileAuthRefresh(context, async (api) =>
          api.reqQueueResourcesGetHistoryByQueueIdTextPaginated(queueIdText, page)
        );
        await writeQueueCache(cacheKey, response.data, generation);
        return response.data;
      },
    });

    return history ?? [];
  },

  /** Add an episode/track next in the queue, then refresh + project. Returns the added resource. */
  addItemNext: async (
    context: MobileAuthRequestContext,
    queueIdText: string,
    itemIdText: string
  ): Promise<DTOQueueResource> => {
    const generation = queueCacheGeneration;
    const added = await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqQueueResourceItemAddNext(queueIdText, itemIdText)
    );
    await refreshQueueViewsAfterMutation(context, queueIdText, generation);
    return added;
  },

  /** Add an episode/track last in the queue, then refresh + project. Returns the added resource. */
  addItemLast: async (
    context: MobileAuthRequestContext,
    queueIdText: string,
    itemIdText: string
  ): Promise<DTOQueueResource> => {
    const generation = queueCacheGeneration;
    const added = await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqQueueResourceItemAddLast(queueIdText, itemIdText)
    );
    await refreshQueueViewsAfterMutation(context, queueIdText, generation);
    return added;
  },

  /** Add a clip next in the queue, then refresh + project. Returns the added resource. */
  addClipNext: async (
    context: MobileAuthRequestContext,
    queueIdText: string,
    clipIdText: string
  ): Promise<DTOQueueResource> => {
    const generation = queueCacheGeneration;
    const added = await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqQueueResourceClipAddNext(queueIdText, clipIdText)
    );
    await refreshQueueViewsAfterMutation(context, queueIdText, generation);
    return added;
  },

  /** Add a clip last in the queue, then refresh + project. Returns the added resource. */
  addClipLast: async (
    context: MobileAuthRequestContext,
    queueIdText: string,
    clipIdText: string
  ): Promise<DTOQueueResource> => {
    const generation = queueCacheGeneration;
    const added = await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqQueueResourceClipAddLast(queueIdText, clipIdText)
    );
    await refreshQueueViewsAfterMutation(context, queueIdText, generation);
    return added;
  },

  /** Add an episode/track between queue neighbors. */
  addItemBetween: async (
    context: MobileAuthRequestContext,
    queueIdText: string,
    itemIdText: string,
    position1: number,
    position2: number
  ): Promise<DTOQueueResource> => {
    const generation = queueCacheGeneration;
    const added = await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqQueueResourceItemAddBetween(
        queueIdText,
        itemIdText,
        toBetweenParams(position1, position2)
      )
    );
    await refreshQueueViewsAfterMutation(context, queueIdText, generation);
    return added;
  },

  /** Add a clip between queue neighbors. */
  addClipBetween: async (
    context: MobileAuthRequestContext,
    queueIdText: string,
    clipIdText: string,
    position1: number,
    position2: number
  ): Promise<DTOQueueResource> => {
    const generation = queueCacheGeneration;
    const added = await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqQueueResourceClipAddBetween(
        queueIdText,
        clipIdText,
        toBetweenParams(position1, position2)
      )
    );
    await refreshQueueViewsAfterMutation(context, queueIdText, generation);
    return added;
  },

  /** Add an item-soundbite next in the queue, then refresh + project. Returns the added resource. */
  addSoundbiteNext: async (
    context: MobileAuthRequestContext,
    queueIdText: string,
    soundbiteIdText: string
  ): Promise<DTOQueueResource> => {
    const generation = queueCacheGeneration;
    const added = await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqQueueResourceItemSoundbiteAddNext(queueIdText, soundbiteIdText)
    );
    await refreshQueueViewsAfterMutation(context, queueIdText, generation);
    return added;
  },

  /** Add an item-soundbite between queue neighbors. */
  addSoundbiteBetween: async (
    context: MobileAuthRequestContext,
    queueIdText: string,
    soundbiteIdText: string,
    position1: number,
    position2: number
  ): Promise<DTOQueueResource> => {
    const generation = queueCacheGeneration;
    const added = await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqQueueResourceItemSoundbiteAddBetween(
        queueIdText,
        soundbiteIdText,
        toBetweenParams(position1, position2)
      )
    );
    await refreshQueueViewsAfterMutation(context, queueIdText, generation);
    return added;
  },

  /** Add an item-soundbite last in the queue, then refresh + project. Returns the added resource. */
  addSoundbiteLast: async (
    context: MobileAuthRequestContext,
    queueIdText: string,
    soundbiteIdText: string
  ): Promise<DTOQueueResource> => {
    const generation = queueCacheGeneration;
    const added = await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqQueueResourceItemSoundbiteAddLast(queueIdText, soundbiteIdText)
    );
    await refreshQueueViewsAfterMutation(context, queueIdText, generation);
    return added;
  },

  /** Add an add-by-RSS item next in the queue, then refresh + project. Returns the added resource. */
  addAddByRssNext: async (
    context: MobileAuthRequestContext,
    queueIdText: string,
    resourceData: object
  ): Promise<DTOQueueResource> => {
    const generation = queueCacheGeneration;
    const added = await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqQueueResourceItemAddByRSSAddNext(queueIdText, {
        add_by_rss_resource_data: withCanonicalAddByRssFeedUrl(resourceData),
      })
    );
    await refreshQueueViewsAfterMutation(context, queueIdText, generation);
    return added;
  },

  /** Add an add-by-RSS item between queue neighbors. */
  addAddByRssBetween: async (
    context: MobileAuthRequestContext,
    queueIdText: string,
    resourceData: object,
    position1: number,
    position2: number
  ): Promise<DTOQueueResource> => {
    const generation = queueCacheGeneration;
    const added = await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqQueueResourceItemAddByRSSAddBetween(queueIdText, {
        add_by_rss_resource_data: withCanonicalAddByRssFeedUrl(resourceData),
        ...toBetweenParams(position1, position2),
      })
    );
    await refreshQueueViewsAfterMutation(context, queueIdText, generation);
    return added;
  },

  /** Add an add-by-RSS item last in the queue, then refresh + project. Returns the added resource. */
  addAddByRssLast: async (
    context: MobileAuthRequestContext,
    queueIdText: string,
    resourceData: object
  ): Promise<DTOQueueResource> => {
    const generation = queueCacheGeneration;
    const added = await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqQueueResourceItemAddByRSSAddLast(queueIdText, {
        add_by_rss_resource_data: withCanonicalAddByRssFeedUrl(resourceData),
      })
    );
    await refreshQueueViewsAfterMutation(context, queueIdText, generation);
    return added;
  },

  /** Remove an episode/track from the queue, then refresh + project. */
  removeItem: async (
    context: MobileAuthRequestContext,
    queueIdText: string,
    itemIdText: string
  ): Promise<DTOQueueResource[]> => {
    const generation = queueCacheGeneration;
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqQueueResourceItemDelete(queueIdText, itemIdText)
    );
    const { upcoming } = await refreshQueueViewsAfterMutation(context, queueIdText, generation);
    return upcoming;
  },

  /** Remove a clip from the queue, then refresh + project. */
  removeClip: async (
    context: MobileAuthRequestContext,
    queueIdText: string,
    clipIdText: string
  ): Promise<DTOQueueResource[]> => {
    const generation = queueCacheGeneration;
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqQueueResourceClipDelete(queueIdText, clipIdText)
    );
    const { upcoming } = await refreshQueueViewsAfterMutation(context, queueIdText, generation);
    return upcoming;
  },

  /** Remove an item-soundbite from the queue, then refresh + project. */
  removeSoundbite: async (
    context: MobileAuthRequestContext,
    queueIdText: string,
    soundbiteIdText: string
  ): Promise<DTOQueueResource[]> => {
    const generation = queueCacheGeneration;
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqQueueResourceItemSoundbiteDelete(queueIdText, soundbiteIdText)
    );
    const { upcoming } = await refreshQueueViewsAfterMutation(context, queueIdText, generation);
    return upcoming;
  },

  /** Remove an add-by-RSS entry from the queue, then refresh + project. */
  removeAddByRss: async (
    context: MobileAuthRequestContext,
    queueIdText: string,
    addByRssHashId: string
  ): Promise<DTOQueueResource[]> => {
    const generation = queueCacheGeneration;
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqQueueResourceItemAddByRSSDelete(queueIdText, addByRssHashId)
    );
    const { upcoming } = await refreshQueueViewsAfterMutation(context, queueIdText, generation);
    return upcoming;
  },

  /**
   * Move the now-playing resource to history (ended / skip), matching the web queue lifecycle.
   * Force-refreshes now-playing + upcoming, invalidates cached history pages, and projects the
   * native cache. Consumers advance via the load-active hook after.
   */
  moveNowPlayingToHistory: async (
    context: MobileAuthRequestContext,
    queueIdText: string,
    target: MoveNowPlayingToHistoryTarget
  ): Promise<{ nowPlaying: DTOQueueResource | null; upcoming: DTOQueueResource[] }> =>
    addResourceToHistory(context, queueIdText, target),

  /**
   * Mark a resource played or unplayed from a list, without it ever having been now-playing.
   */
  markAsPlayed: async (
    context: MobileAuthRequestContext,
    queueIdText: string,
    target: MoveNowPlayingToHistoryTarget
  ): Promise<void> => {
    const completed = target.completed ?? true;
    if (target.kind === 'add_by_rss') {
      await addResourceToHistory(context, queueIdText, { ...target, completed });
      return;
    }
    await addResourceToHistory(context, queueIdText, { ...target, completed });
  },

  /**
   * Refresh queue cache rows from authoritative server state after playback reconcile and re-project
   * the native cache snapshot for car/watch surfaces. The queue list is refreshed first: a reconcile
   * can be the moment a queue first appears or takes over as active, and screens choose their queue
   * from that list before they read any resources.
   */
  refreshAfterPlaybackReconcile: async (
    context: MobileAuthRequestContext,
    queueIdTexts: readonly string[]
  ): Promise<void> => {
    const generation = queueCacheGeneration;
    const uniqueQueueIdTexts = [...new Set(queueIdTexts)].filter(
      (queueIdText) => queueIdText.length > 0
    );
    if (uniqueQueueIdTexts.length === 0) {
      return;
    }

    await forceRefreshQueues(context, generation);

    const abridged = await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqQueueResourcesGetAllByAccountAbridged()
    );
    await writeQueueCache(CACHE_KEY_ABRIDGED_INDEX, abridged, generation);
    publishQueueCompletionFromAbridged(abridged);

    for (const queueIdText of uniqueQueueIdTexts) {
      await deleteQueueCacheByPrefix(`history:${queueIdText}:`);
      await Promise.all([
        forceRefreshNowPlaying(context, queueIdText, generation),
        forceRefreshUpcoming(context, queueIdText, generation),
        forceRefreshHistoryPage(context, queueIdText, 1, generation),
      ]);
      await projectQueueIfCurrent(queueIdText, generation);
    }
  },

  /** One zone post. Does not refresh now-playing, upcoming, or history. */
  postQueueResourceZone: async (
    context: MobileAuthRequestContext,
    queueIdText: string,
    zone: QueueResourceZone,
    resource: DTOQueueResource,
    params: QueueExtraParams = {}
  ): Promise<void> => {
    await postQueueResourceZone(context, queueIdText, zone, resource, params);
  },

  /**
   * Rewrites the local now-playing, upcoming, and first history page to match a skip that already
   * happened on device. History rows passed in are newest first and sit in front of the cached page.
   */
  applyLocalQueueOrder: async (
    queueIdText: string,
    snapshot: {
      nowPlaying: DTOQueueResource | null;
      upcoming: DTOQueueResource[];
      historyNewestFirst: DTOQueueResource[];
    }
  ): Promise<void> => {
    const generation = queueCacheGeneration;
    const nowPlaying =
      snapshot.nowPlaying === null ? null : { ...snapshot.nowPlaying, list_position: '0' };
    const upcoming = snapshot.upcoming.map((row, index) => ({
      ...row,
      list_position: String(index + 1),
    }));
    if (nowPlaying !== null) {
      await writeQueueCache(nowPlayingCacheKey(queueIdText), nowPlaying, generation);
    }
    await writeQueueCache(upcomingCacheKey(queueIdText), upcoming, generation);
    if (snapshot.historyNewestFirst.length > 0) {
      const cacheKey = historyCacheKey(queueIdText, 1);
      const cached = (await readQueueCache<DTOQueueResource[]>(cacheKey))?.value ?? [];
      const prefixIds = new Set(
        snapshot.historyNewestFirst
          .map((row) => queueResourceContentId(row))
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      );
      const rest = cached.filter((row) => {
        const id = queueResourceContentId(row);
        return id === null || !prefixIds.has(id);
      });
      const page = [...snapshot.historyNewestFirst, ...rest].map((row, index) => ({
        ...row,
        list_position: historyListPosition(index),
      }));
      await writeQueueCache(cacheKey, page, generation);
    }
    publishQueueDataChanged();
    void projectQueueForQueue(queueIdText);
  },

  /**
   * Drop every cached queue row and empty both car queue snapshots, the advance window (it holds
   * manual queue rows), its saved source (it holds auto-queue rows), and history.
   */
  clearAll: async (): Promise<void> => {
    resetQueueCompletionStore();
    queueCacheGeneration += 1;
    await initializeDatabase();
    await getDb().delete(schema.queueCache);
    const empty = { nowPlayingIdText: null, entries: [] };
    const {
      projectAdvanceWindowToNativeCache,
      projectHistoryIndexToNativeCache,
      projectQueueSnapshotAvToNativeCache,
      projectQueueSnapshotMusicToNativeCache,
    } = await import('../nativeCache/projection');
    await projectQueueSnapshotAvToNativeCache(empty);
    await projectQueueSnapshotMusicToNativeCache(empty);
    await projectAdvanceWindowToNativeCache({
      mediumBucket: 'av',
      anchorIdText: null,
      anchorKind: null,
      entries: [],
    });
    await nativeAdvanceSourceRepository.clear();
    await projectHistoryIndexToNativeCache({ entries: [] });
  },
};
