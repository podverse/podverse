import type { SortPrefScope } from './sortPrefs.js';

/**
 * The remembered entry for one Browse media type: its sort, its Top window, and its list or grid.
 *
 * Browse and Home lists of the same media type are separate instances, so the name carries a
 * `browse-` prefix. Podcasts, artists, and albums resolve to the same key as
 * `browseListViewModeScope`, so one entry holds every choice for that list.
 */
export const browseListScope = (mediaType: string): SortPrefScope => {
  return { kind: 'list', name: `browse-${mediaType}` };
};
