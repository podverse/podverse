import { eq } from 'drizzle-orm';

import type {
  ChannelSectionChromeFlags,
  ItemSectionChromeFlags,
  SectionChromeEntityKind,
} from '../../lib/sectionChromeFlags';
import {
  getCachedChannelSectionFlags,
  getCachedItemSectionFlags,
  hydrateSectionChromeFlagsMemory,
  mergeChannelSectionChromeFlags,
  mergeItemSectionChromeFlags,
  parseChannelSectionChromeFlags,
  parseItemSectionChromeFlags,
  sectionChromeCacheKey,
  setCachedChannelSectionFlags,
  setCachedItemSectionFlags,
} from '../../lib/sectionChromeFlags';
import { getDb, initializeDatabase, safeJsonParse, schema } from '../db';

const readStoredJson = async (cacheKey: string): Promise<unknown> => {
  const rows = await getDb()
    .select({ flagsJson: schema.sectionChromeFlags.flagsJson })
    .from(schema.sectionChromeFlags)
    .where(eq(schema.sectionChromeFlags.cacheKey, cacheKey))
    .limit(1);
  const flagsJson = rows[0]?.flagsJson;
  if (flagsJson === undefined) {
    return null;
  }
  return safeJsonParse<unknown>(flagsJson);
};

const writeFlags = async (kind: SectionChromeEntityKind, idText: string, flags: object) => {
  const cacheKey = sectionChromeCacheKey(kind, idText);
  const flagsJson = JSON.stringify(flags);
  const updatedAt = Date.now();
  await getDb()
    .insert(schema.sectionChromeFlags)
    .values({
      cacheKey,
      flagsJson,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: schema.sectionChromeFlags.cacheKey,
      set: {
        flagsJson,
        updatedAt,
      },
    });
};

export const sectionChromeFlagsRepository = {
  /**
   * Load every stored row into the sync map. Safe to call more than once; each call replaces the
   * map from disk so a later write is not shadowed by a stale hydrate.
   */
  hydrateMemory: async (): Promise<void> => {
    await initializeDatabase();
    const rows = await getDb()
      .select({
        cacheKey: schema.sectionChromeFlags.cacheKey,
        flagsJson: schema.sectionChromeFlags.flagsJson,
      })
      .from(schema.sectionChromeFlags);
    hydrateSectionChromeFlagsMemory(rows);
  },

  getChannel: async (idText: string): Promise<ChannelSectionChromeFlags | null> => {
    const cached = getCachedChannelSectionFlags(idText);
    if (cached !== null) {
      return cached;
    }
    await initializeDatabase();
    const cacheKey = sectionChromeCacheKey('channel', idText);
    const stored = await readStoredJson(cacheKey);
    if (stored === null) {
      return null;
    }
    const parsed = parseChannelSectionChromeFlags(stored);
    setCachedChannelSectionFlags(idText, parsed);
    return parsed;
  },

  getItem: async (idText: string): Promise<ItemSectionChromeFlags | null> => {
    const cached = getCachedItemSectionFlags(idText);
    if (cached !== null) {
      return cached;
    }
    await initializeDatabase();
    const cacheKey = sectionChromeCacheKey('item', idText);
    const stored = await readStoredJson(cacheKey);
    if (stored === null) {
      return null;
    }
    const parsed = parseItemSectionChromeFlags(stored);
    setCachedItemSectionFlags(idText, parsed);
    return parsed;
  },

  mergeChannel: async (
    idText: string,
    patch: Partial<ChannelSectionChromeFlags>
  ): Promise<ChannelSectionChromeFlags> => {
    await initializeDatabase();
    const current =
      getCachedChannelSectionFlags(idText) ??
      parseChannelSectionChromeFlags(
        await readStoredJson(sectionChromeCacheKey('channel', idText))
      );
    const next = mergeChannelSectionChromeFlags(current, patch);
    setCachedChannelSectionFlags(idText, next);
    await writeFlags('channel', idText, next);
    return next;
  },

  mergeItem: async (
    idText: string,
    patch: Partial<ItemSectionChromeFlags>
  ): Promise<ItemSectionChromeFlags> => {
    await initializeDatabase();
    const current =
      getCachedItemSectionFlags(idText) ??
      parseItemSectionChromeFlags(await readStoredJson(sectionChromeCacheKey('item', idText)));
    const next = mergeItemSectionChromeFlags(current, patch);
    setCachedItemSectionFlags(idText, next);
    await writeFlags('item', idText, next);
    return next;
  },
};
