import type { QueryParamsMedium } from './medium.js';
import type { SortPrefScope } from './sortPrefs.js';

/**
 * Channel lists that can draw as an artwork grid. Home, Browse, and the web directory each keep
 * their own list/grid for these types — podcasts on Home is not podcasts on Browse.
 */
export const CHANNEL_LIST_VIEW_MODE_TYPES = ['albums', 'artists', 'podcasts'] as const;

export type ChannelListViewModeType = (typeof CHANNEL_LIST_VIEW_MODE_TYPES)[number];

export const isChannelListViewModeType = (value: string): value is ChannelListViewModeType => {
  return CHANNEL_LIST_VIEW_MODE_TYPES.some((type) => type === value);
};

export const DIRECTORY_LIST_VIEW_MODE_SCOPE_PODCASTS: SortPrefScope = {
  kind: 'list',
  name: 'podcasts',
};
export const DIRECTORY_LIST_VIEW_MODE_SCOPE_ARTISTS: SortPrefScope = {
  kind: 'list',
  name: 'artists',
};
export const DIRECTORY_LIST_VIEW_MODE_SCOPE_ALBUMS: SortPrefScope = {
  kind: 'list',
  name: 'albums',
};

export const BROWSE_LIST_VIEW_MODE_SCOPE_PODCASTS: SortPrefScope = {
  kind: 'list',
  name: 'browse-podcasts',
};
export const BROWSE_LIST_VIEW_MODE_SCOPE_ARTISTS: SortPrefScope = {
  kind: 'list',
  name: 'browse-artists',
};
export const BROWSE_LIST_VIEW_MODE_SCOPE_ALBUMS: SortPrefScope = {
  kind: 'list',
  name: 'browse-albums',
};

export const HOME_LIST_VIEW_MODE_SCOPE_PODCASTS: SortPrefScope = {
  kind: 'list',
  name: 'home-podcasts',
};
export const HOME_LIST_VIEW_MODE_SCOPE_ARTISTS: SortPrefScope = {
  kind: 'list',
  name: 'home-artists',
};
export const HOME_LIST_VIEW_MODE_SCOPE_ALBUMS: SortPrefScope = {
  kind: 'list',
  name: 'home-albums',
};
export const HOME_LIST_VIEW_MODE_SCOPE_ALL: SortPrefScope = { kind: 'list', name: 'home-all' };

export const directoryListViewModeScope = (type: ChannelListViewModeType): SortPrefScope => {
  if (type === 'artists') {
    return DIRECTORY_LIST_VIEW_MODE_SCOPE_ARTISTS;
  }
  if (type === 'albums') {
    return DIRECTORY_LIST_VIEW_MODE_SCOPE_ALBUMS;
  }
  return DIRECTORY_LIST_VIEW_MODE_SCOPE_PODCASTS;
};

export const browseListViewModeScope = (type: ChannelListViewModeType): SortPrefScope => {
  if (type === 'artists') {
    return BROWSE_LIST_VIEW_MODE_SCOPE_ARTISTS;
  }
  if (type === 'albums') {
    return BROWSE_LIST_VIEW_MODE_SCOPE_ALBUMS;
  }
  return BROWSE_LIST_VIEW_MODE_SCOPE_PODCASTS;
};

export const homeListViewModeScopeForMedium = (medium: QueryParamsMedium): SortPrefScope => {
  if (medium === 'av') {
    return HOME_LIST_VIEW_MODE_SCOPE_PODCASTS;
  }
  if (medium === 'publisher-music') {
    return HOME_LIST_VIEW_MODE_SCOPE_ARTISTS;
  }
  if (medium === 'music') {
    return HOME_LIST_VIEW_MODE_SCOPE_ALBUMS;
  }
  return HOME_LIST_VIEW_MODE_SCOPE_ALL;
};
