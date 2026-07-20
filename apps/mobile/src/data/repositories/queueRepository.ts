import { eq } from 'drizzle-orm';

import type { DTOQueue, DTOQueueResource } from '@podverse/helpers/dto';

// Import from the request module (not the auth barrel) to keep the React AuthProvider out of the
// data-layer module graph.
import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { getDb, initializeDatabase, safeJsonParse, schema } from '../db';
import type { NativeCacheQueueEntry } from '../nativeCache';
import { projectQueueSnapshotToNativeCache } from '../nativeCache';
import { readThroughOrFetch } from '../sync';
import type { MobileAuthRequestContext } from './types';

const QUEUE_TTL_MS = 5 * 60 * 1000;

const CACHE_KEY_QUEUES = 'queues';
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

const writeQueueCache = async (cacheKey: string, value: unknown): Promise<void> => {
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

const toNativeCacheEntry = (resource: DTOQueueResource): NativeCacheQueueEntry => {
  const item = resource.item;
  return {
    idText: item.id_text,
    title: item.title ?? item.id_text,
    artworkUrl: item.item_images[0]?.url ?? item.channel?.channel_images?.[0]?.url ?? null,
    // Enclosure resolution for car/watch playback lands with the real native cache (Track 12).
    mediaUrl: null,
  };
};

/**
 * Project the current now-playing + upcoming snapshot to the native cache. Repositories call this
 * after every successful queue sync/mutation — CarPlay / Android Auto / watch complications read
 * this native cache, never SQLite (see DOCS-MOBILE-DATA-LAYER-OFFLINE.md §7.1). Stub until Track 12.
 */
const projectQueueForQueue = async (queueIdText: string): Promise<void> => {
  const nowPlaying =
    (await readQueueCache<DTOQueueResource>(nowPlayingCacheKey(queueIdText)))?.value ?? null;
  const upcoming =
    (await readQueueCache<DTOQueueResource[]>(upcomingCacheKey(queueIdText)))?.value ?? [];

  await projectQueueSnapshotToNativeCache({
    nowPlayingIdText: nowPlaying?.item.id_text ?? null,
    entries: upcoming.map(toNativeCacheEntry),
  });
};

/**
 * Queue / now-playing / upcoming / history repository. Reads SQLite first (offline-first); a
 * missing/stale cache triggers a background sync via the queue `req*` wrappers, which live here —
 * not in screens/hooks. DTO shapes match web (`@podverse/helpers/dto`). Mutations arrive in Track
 * 10 and will write local → sync → project to the native cache.
 */
export const queueRepository = {
  getPrimaryQueue: async (context: MobileAuthRequestContext): Promise<DTOQueue | null> => {
    const queues = await readThroughOrFetch<DTOQueue[]>({
      readLocal: async () => (await readQueueCache<DTOQueue[]>(CACHE_KEY_QUEUES))?.value ?? null,
      isStale: async () => isCacheStale(await readQueueCache<DTOQueue[]>(CACHE_KEY_QUEUES)),
      fetchRemote: async () => {
        const fetched = await requestWithMobileAuthRefresh(context, async (api) =>
          api.reqQueueGetAllForAccountPrivate()
        );
        await writeQueueCache(CACHE_KEY_QUEUES, fetched);
        return fetched;
      },
    });

    return queues === null ? null : selectPrimaryQueue(queues);
  },

  getNowPlaying: async (
    context: MobileAuthRequestContext,
    queueIdText: string
  ): Promise<DTOQueueResource | null> => {
    const cacheKey = nowPlayingCacheKey(queueIdText);
    const hit = await readQueueCache<DTOQueueResource>(cacheKey);

    const fetchRemote = async (): Promise<DTOQueueResource | null> => {
      const fetched = await requestWithMobileAuthRefresh(context, async (api) =>
        api.reqQueueResourcesGetNowPlayingByQueueIdText(queueIdText)
      );
      if (fetched !== null) {
        await writeQueueCache(cacheKey, fetched);
      }
      await projectQueueForQueue(queueIdText);
      return fetched;
    };

    // now-playing can legitimately be null, so this can't use readThroughOrFetch (null = miss).
    if (hit === null) {
      try {
        return await fetchRemote();
      } catch (error) {
        if (__DEV__) {
          console.warn('[queue] now-playing fetch failed with empty cache', error);
        }
        return null;
      }
    }

    if (isCacheStale(hit)) {
      void fetchRemote().catch((error) => {
        if (__DEV__) {
          console.warn('[queue] now-playing background refresh failed', error);
        }
      });
    }

    return hit.value;
  },

  getUpcoming: async (
    context: MobileAuthRequestContext,
    queueIdText: string
  ): Promise<DTOQueueResource[]> => {
    const cacheKey = upcomingCacheKey(queueIdText);
    const upcoming = await readThroughOrFetch<DTOQueueResource[]>({
      readLocal: async () => (await readQueueCache<DTOQueueResource[]>(cacheKey))?.value ?? null,
      isStale: async () => isCacheStale(await readQueueCache<DTOQueueResource[]>(cacheKey)),
      fetchRemote: async () => {
        const fetched = await requestWithMobileAuthRefresh(context, async (api) =>
          api.reqQueueResourcesGetAllUpcomingByQueueIdText(queueIdText)
        );
        await writeQueueCache(cacheKey, fetched);
        await projectQueueForQueue(queueIdText);
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
    const history = await readThroughOrFetch<DTOQueueResource[]>({
      readLocal: async () => (await readQueueCache<DTOQueueResource[]>(cacheKey))?.value ?? null,
      isStale: async () => isCacheStale(await readQueueCache<DTOQueueResource[]>(cacheKey)),
      fetchRemote: async () => {
        const response = await requestWithMobileAuthRefresh(context, async (api) =>
          api.reqQueueResourcesGetHistoryByQueueIdTextPaginated(queueIdText, page)
        );
        await writeQueueCache(cacheKey, response.data);
        return response.data;
      },
    });

    return history ?? [];
  },
};
