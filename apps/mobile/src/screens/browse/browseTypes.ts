import { QUERY_PARAMS_STATS_RANGE_VALUES } from '@podverse/helpers-requests';
import type { QueryParamsStatsRange } from '@podverse/helpers-requests';

import type { HomeMediaType } from '../../prefs/preferredMediaType';

export const HOME_MEDIA_TYPE_ORDER: HomeMediaType[] = [
  'podcasts',
  'episodes',
  'clips',
  'artists',
  'albums',
  'tracks',
];

export const BROWSE_MEDIA_TYPE_ORDER = [
  'podcasts',
  'episodes',
  'clips',
  'videos',
  'artists',
  'albums',
  'tracks',
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
  playlists: 'features.playlist.playlists',
  podcasts: 'media.podcast.podcasts',
  tracks: 'media.music.tracks',
  users: 'features.browse.users',
  videos: 'media.video.videos',
};

/** Podcasts, episodes, clips, and video channels carry directory categories. Music does not. */
export const BROWSE_CATEGORY_MEDIA_TYPES: readonly BrowseMediaType[] = [
  'podcasts',
  'episodes',
  'clips',
  'videos',
];

export const isBrowseCategoryMediaType = (mediaType: BrowseMediaType): boolean => {
  return BROWSE_CATEGORY_MEDIA_TYPES.includes(mediaType);
};

export const BROWSE_RANGE_OPTIONS = QUERY_PARAMS_STATS_RANGE_VALUES;

export type BrowseRangeOption = QueryParamsStatsRange;

export const DEFAULT_BROWSE_RANGE: BrowseRangeOption = 'week';

export const DEFAULT_BROWSE_MEDIA_TYPE: BrowseMediaType = 'podcasts';

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
  return mediaType === 'episodes' || mediaType === 'clips' || mediaType === 'tracks';
};

export const isBrowseMediaType = (value: string): value is BrowseMediaType => {
  return BROWSE_MEDIA_TYPE_ORDER.some((mediaType) => mediaType === value);
};

export const isBrowseRangeOption = (value: string): value is BrowseRangeOption => {
  return BROWSE_RANGE_OPTIONS.some((range) => range === value);
};
