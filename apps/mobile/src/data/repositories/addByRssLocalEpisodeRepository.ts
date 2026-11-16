import { asc, eq } from 'drizzle-orm';

import type { AddByRSSMappedFeed } from '@podverse/parser-mapping';

import { getDb, initializeDatabase, safeJsonParse, schema } from '../db';

type ItemBundle = AddByRSSMappedFeed['items'][number];

export type AddByRssLocalEpisodeRecord = {
  downloadIdText: string;
  itemBundle: ItemBundle;
};

const isItemBundle = (value: unknown): value is ItemBundle => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (!('item' in value) || typeof value.item !== 'object' || value.item === null) {
    return false;
  }
  return 'enclosures' in value && Array.isArray(value.enclosures);
};

/** Local episodes for one feed. Rows whose bundle JSON cannot be read are skipped. */
export const addByRssLocalEpisodeRepository = {
  listByFeedUrl: async (feedUrl: string): Promise<AddByRssLocalEpisodeRecord[]> => {
    await initializeDatabase();
    const rows = await getDb()
      .select()
      .from(schema.addByRssLocalEpisode)
      .where(eq(schema.addByRssLocalEpisode.feedUrl, feedUrl))
      .orderBy(asc(schema.addByRssLocalEpisode.createdAt));
    return rows.flatMap((row) => {
      const parsed = safeJsonParse<unknown>(row.itemBundleJson);
      if (!isItemBundle(parsed)) {
        return [];
      }
      return [{ downloadIdText: row.downloadIdText, itemBundle: parsed }];
    });
  },

  remove: async (downloadIdText: string): Promise<void> => {
    await initializeDatabase();
    await getDb()
      .delete(schema.addByRssLocalEpisode)
      .where(eq(schema.addByRssLocalEpisode.downloadIdText, downloadIdText));
  },

  upsert: async (input: {
    downloadIdText: string;
    feedUrl: string;
    itemBundle: ItemBundle;
  }): Promise<void> => {
    await initializeDatabase();
    const itemBundleJson = JSON.stringify(input.itemBundle);
    await getDb()
      .insert(schema.addByRssLocalEpisode)
      .values({
        createdAt: Date.now(),
        downloadIdText: input.downloadIdText,
        feedUrl: input.feedUrl,
        itemBundleJson,
      })
      .onConflictDoUpdate({
        set: { feedUrl: input.feedUrl, itemBundleJson },
        target: schema.addByRssLocalEpisode.downloadIdText,
      });
  },
};
