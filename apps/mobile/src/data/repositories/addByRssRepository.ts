import { desc, eq } from 'drizzle-orm';

import type { AddByRSSMappedFeed } from '@podverse/parser-mapping';

import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import { getDb, initializeDatabase, safeJsonParse, schema } from '../db';
import type { AddByRssFeedRow } from '../db/schema';

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
    playbackPosition: row.playbackPosition,
  };
};

/**
 * Add-by-RSS feed repository — the source of truth for the mobile RSS list and add-by-RSS playback.
 * Reads SQLite first so the list works offline; the last successful `@podverse/parser-mapping`
 * compat bundle is persisted per feed so playback can build full `AddByRSSResourceData`. All API
 * calls (follow/unfollow/parse) stay in the hooks that orchestrate the flow; this repository owns
 * only local persistence (see mobile-data-layer skill).
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
   * untouched so a previously parsed bundle is not clobbered.
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
      const mappedFeedJson = mappedFeed === null ? null : JSON.stringify(mappedFeed);
      await getDb()
        .insert(schema.addByRssFeed)
        .values({ ...baseValues, mappedFeedJson })
        .onConflictDoUpdate({
          target: schema.addByRssFeed.feedUrl,
          set: { ...baseValues, mappedFeedJson },
        });
      return;
    }

    await getDb()
      .insert(schema.addByRssFeed)
      .values({ ...baseValues, mappedFeedJson: null })
      .onConflictDoUpdate({
        target: schema.addByRssFeed.feedUrl,
        set: baseValues,
      });
  },

  removeFeed: async (feedUrl: string): Promise<void> => {
    await initializeDatabase();
    await getDb().delete(schema.addByRssFeed).where(eq(schema.addByRssFeed.feedUrl, feedUrl));
  },

  /** Clear all feeds (session reset / logout). */
  clear: async (): Promise<void> => {
    await initializeDatabase();
    await getDb().delete(schema.addByRssFeed);
  },
};
