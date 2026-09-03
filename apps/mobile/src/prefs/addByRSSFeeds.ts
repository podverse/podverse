import type { AddByRSSResourceType } from '@podverse/helpers';

/**
 * Add-by-RSS feed record shape shared by the RSS list, add flow, and playback.
 *
 * The source of truth for these feeds is SQLite via `addByRssRepository` (see
 * `src/data/repositories/addByRssRepository.ts` and the mobile-data-layer skill). AsyncStorage
 * stores only non-entity preferences.
 */
export type MobileAddByRSSFeedRecord = {
  id: number;
  idText: string;
  resourceType: AddByRSSResourceType;
  feedUrl: string;
  title: string | null;
  imageUrl: string | null;
  updatedAt: string;
  enclosureUrl: string | null;
  playbackPosition: string | null;
  /**
   * When the feed last published, from its newest item. Null until a parse has been stored, or when
   * the feed carries no usable dates — both of which sort as "unknown" rather than as "ancient".
   */
  latestItemPubDateMs: number | null;
};
