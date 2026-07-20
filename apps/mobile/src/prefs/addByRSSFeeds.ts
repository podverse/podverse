import type { AddByRSSResourceType } from '@podverse/helpers';

/**
 * Add-by-RSS feed record shape shared by the RSS list, add flow, and playback.
 *
 * The source of truth for these feeds is now SQLite via `addByRssRepository` (see
 * `src/data/repositories/addByRssRepository.ts` and the mobile-data-layer skill). The former
 * AsyncStorage-backed `readAddByRSSFeeds` / `writeAddByRSSFeeds` store was retired in Track 9b.5;
 * AsyncStorage remains only for non-entity preferences.
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
};
