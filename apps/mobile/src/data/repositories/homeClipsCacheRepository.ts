import { eq } from 'drizzle-orm';

import { isObjectLike } from '@podverse/helpers/guards';
import type { QueryParamsStatsRange } from '@podverse/helpers-requests';

import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { getDb, initializeDatabase, safeJsonParse, schema } from '../db';
import type { MobileAuthRequestContext } from './types';

/**
 * Last subscribed-clips page Home can paint without waiting on the network.
 *
 * Clips have no per-channel item table. The queue writes this snapshot; Home only reads it.
 */
const HOME_CLIPS_CACHE_KEY = 'home.clips.subscribed';
const HOME_CLIPS_PAGE = 1;

type HomeClipsCachePayload = {
  items: unknown[];
};

const isHomeClipsCachePayload = (value: unknown): value is HomeClipsCachePayload => {
  return isObjectLike(value) && Array.isArray(value.items);
};

export const homeClipsCacheRepository = {
  /** Cached clip list payload. Empty when nothing has been synced yet. */
  listPayload: async (): Promise<unknown[]> => {
    await initializeDatabase();
    const rows = await getDb()
      .select({ value: schema.kvMeta.value })
      .from(schema.kvMeta)
      .where(eq(schema.kvMeta.key, HOME_CLIPS_CACHE_KEY))
      .limit(1);
    const raw = rows[0]?.value;
    if (raw === undefined || raw === null) {
      return [];
    }

    const parsed = safeJsonParse<unknown>(raw);
    return isHomeClipsCachePayload(parsed) ? parsed.items : [];
  },

  replacePayload: async (items: readonly unknown[]): Promise<void> => {
    await initializeDatabase();
    const updatedAt = Date.now();
    const value = JSON.stringify({ items });
    await getDb()
      .insert(schema.kvMeta)
      .values({ key: HOME_CLIPS_CACHE_KEY, value, updatedAt })
      .onConflictDoUpdate({
        target: schema.kvMeta.key,
        set: { updatedAt, value },
      });
  },

  /**
   * Pull the subscribed clip page and store it. Home rereads after the queue settles.
   *
   * `sort` is the directory token the endpoint accepts. Alphabetical Home order is applied when
   * the screen reads the cache, because the endpoint has no title sort.
   */
  refreshFromAccount: async (
    context: MobileAuthRequestContext,
    options: { range: QueryParamsStatsRange | null; sort: 'recent' | 'top' }
  ): Promise<void> => {
    const response = await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqClipGetManyPublic({
        category: null,
        medium: 'podcasts',
        page: HOME_CLIPS_PAGE,
        range: options.range,
        sort: options.sort,
        type: 'subscribed',
      })
    );
    await homeClipsCacheRepository.replacePayload(response.data);
  },
};
