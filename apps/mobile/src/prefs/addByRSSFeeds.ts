import type { AddByRSSResourceType } from '@podverse/helpers';

/** The credential failures a parse can report that move a feed into the needs-credentials section. */
export type AddByRssAuthFailure = 'credentials_required' | 'credentials_rejected';

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
  /**
   * The feed needs Basic Auth. The username and password live in SecureStore, keyed by account.
   * Undefined on a record being written leaves the stored flag as it is.
   */
  requiresCredentials?: boolean;
  /**
   * The last credential failure a parse reported for this feed. Null clears it; undefined on a
   * record being written leaves the stored value as it is.
   */
  lastAuthFailure?: AddByRssAuthFailure | null;
};
