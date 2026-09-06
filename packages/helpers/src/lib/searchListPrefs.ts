import type { QueryParamsPodcastIndexSearchMedium } from './medium.js';
import { QUERY_PARAMS_PODCAST_INDEX_SEARCH_MEDIUMS } from './medium.js';
import type { SortPrefScope, SortPrefValue } from './sortPrefs.js';

/**
 * Search is one global list, so its name is the whole scope. Web and mobile must use this same
 * key or a laptop and a phone would treat the chip as two different screens.
 */
export const SEARCH_LIST_SORT_PREF_SCOPE: SortPrefScope = { kind: 'list', name: 'search' };

export const DEFAULT_PODCAST_INDEX_SEARCH_MEDIUM: QueryParamsPodcastIndexSearchMedium = 'all';

export const isPodcastIndexSearchMedium = (
  value: string
): value is QueryParamsPodcastIndexSearchMedium => {
  return QUERY_PARAMS_PODCAST_INDEX_SEARCH_MEDIUMS.some((medium) => medium === value);
};

/**
 * The Podcast Index chip this list should open with, default already applied.
 *
 * Stored under `type` because All / Music is a structured type filter, not a media-type pill and
 * not free text.
 */
export const resolvePodcastIndexSearchMedium = (
  stored: SortPrefValue | null | undefined
): QueryParamsPodcastIndexSearchMedium => {
  const value = stored?.type;
  if (value !== undefined && isPodcastIndexSearchMedium(value)) {
    return value;
  }

  return DEFAULT_PODCAST_INDEX_SEARCH_MEDIUM;
};
