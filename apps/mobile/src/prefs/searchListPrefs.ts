import type { QueryParamsPodcastIndexSearchMedium, SortPrefScope } from '@podverse/helpers';

import { readSortPref, writeSortPref } from './sortPrefs';

/**
 * Same scope key as web (`packages/helpers` `SEARCH_LIST_SORT_PREF_SCOPE`). Inlined here so
 * Search does not depend on a helpers rebuild to paint the default All chip.
 */
const SEARCH_LIST_SORT_PREF_SCOPE: SortPrefScope = { kind: 'list', name: 'search' };

const isSearchMedium = (value: string): value is QueryParamsPodcastIndexSearchMedium => {
  return value === 'all' || value === 'music';
};

/**
 * The All / Music chip Search should open with, default already applied.
 *
 * Read before the first Podcast Index request so a stored Music choice does not paint All results
 * and then rearrange itself.
 */
export const readSearchListMedium = async (): Promise<QueryParamsPodcastIndexSearchMedium> => {
  const stored = await readSortPref(SEARCH_LIST_SORT_PREF_SCOPE);
  const value = stored?.type;
  if (value !== undefined && isSearchMedium(value)) {
    return value;
  }

  return 'all';
};

export const writeSearchListMedium = async (
  medium: QueryParamsPodcastIndexSearchMedium
): Promise<void> => {
  await writeSortPref(SEARCH_LIST_SORT_PREF_SCOPE, { type: medium });
};
