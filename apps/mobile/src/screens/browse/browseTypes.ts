import type { QueryParamsStatsRange } from '@podverse/helpers-requests';
import { QUERY_PARAMS_STATS_RANGE_VALUES } from '@podverse/helpers-requests';

import type { HomeMediaType } from '../../prefs/preferredMediaType';

export const HOME_MEDIA_TYPE_ORDER: HomeMediaType[] = [
  'podcasts',
  'episodes',
  'clips',
  'artists',
  'albums',
  'tracks',
  'livestreams',
];

export const BROWSE_MEDIA_TYPE_ORDER = [
  'podcasts',
  'episodes',
  'clips',
  'artists',
  'albums',
  'tracks',
  'livestreams',
  'playlists',
  'users',
] as const;

export type BrowseMediaType = (typeof BROWSE_MEDIA_TYPE_ORDER)[number];

export type DirectoryMediaType = BrowseMediaType;

export const MEDIA_TYPE_LABEL_KEYS: Record<BrowseMediaType, string> = {
  albums: 'media.music.albums',
  artists: 'media.music.artists',
  clips: 'features.clip.clips',
  episodes: 'media.podcast.episodes',
  livestreams: 'media.livestream.livestreams',
  playlists: 'features.playlist.playlists',
  podcasts: 'media.podcast.podcasts',
  tracks: 'media.music.tracks',
  users: 'features.browse.users',
};

/** Podcasts, episodes, and clips carry directory categories. Music does not. */
export const BROWSE_CATEGORY_MEDIA_TYPES: readonly BrowseMediaType[] = [
  'podcasts',
  'episodes',
  'clips',
];

export const isBrowseCategoryMediaType = (mediaType: BrowseMediaType): boolean => {
  return BROWSE_CATEGORY_MEDIA_TYPES.includes(mediaType);
};

/** Every Browse directory list except Livestreams sorts by Recent or Top, so the sort chip applies. */
export const isBrowseSortableMediaType = (mediaType: BrowseMediaType): boolean => {
  return mediaType !== 'livestreams';
};

/** The category picker is not a directory list, so the sort chip stays off while it is open. */
export const shouldShowBrowseSortChip = (
  mediaType: BrowseMediaType,
  isCategoryView: boolean
): boolean => {
  return !isCategoryView && isBrowseSortableMediaType(mediaType);
};

export const shouldShowBrowseCategoryChip = (mediaType: BrowseMediaType): boolean => {
  return isBrowseCategoryMediaType(mediaType);
};

export const BROWSE_RANGE_OPTIONS = QUERY_PARAMS_STATS_RANGE_VALUES;

export type BrowseRangeOption = QueryParamsStatsRange;

export const DEFAULT_BROWSE_RANGE: BrowseRangeOption = 'week';

export const DEFAULT_BROWSE_MEDIA_TYPE: BrowseMediaType = 'podcasts';

/** Directory orders Browse offers, in menu order. The tokens are the API `sort` values. */
export const BROWSE_SORT_OPTIONS = ['recent', 'top'] as const;

export type BrowseSortOption = (typeof BROWSE_SORT_OPTIONS)[number];

/** Every Browse list opens on Top for the past week until the listener changes that list. */
export const DEFAULT_BROWSE_SORT: BrowseSortOption = 'top';

export const BROWSE_SORT_LABEL_KEYS: Record<BrowseSortOption, string> = {
  recent: 'filters.sort.recent',
  top: 'filters.sort.top',
};

/** Top is the only Browse order that sends a stats window. */
export const browseSortToApiRange = (
  sort: BrowseSortOption,
  range: BrowseRangeOption
): BrowseRangeOption | null => {
  return sort === 'top' ? range : null;
};

export const BROWSE_RANGE_LABEL_KEYS: Record<BrowseRangeOption, string> = {
  'all-time': 'features.browse.range_all_time',
  day: 'filters.range.day',
  month: 'filters.range.month',
  week: 'filters.range.week',
};

export const BROWSE_RANGE_MENU_LABEL_KEYS: Record<BrowseRangeOption, string> = {
  'all-time': 'filters.range.all_time',
  day: 'filters.range.day',
  month: 'filters.range.month',
  week: 'filters.range.week',
};

export const isPlayableDirectoryMediaType = (mediaType: DirectoryMediaType): boolean => {
  return (
    mediaType === 'episodes' ||
    mediaType === 'clips' ||
    mediaType === 'tracks' ||
    mediaType === 'livestreams'
  );
};

export const isBrowseMediaType = (value: string): value is BrowseMediaType => {
  return BROWSE_MEDIA_TYPE_ORDER.some((mediaType) => mediaType === value);
};

export const isBrowseRangeOption = (value: string): value is BrowseRangeOption => {
  return BROWSE_RANGE_OPTIONS.some((range) => range === value);
};
