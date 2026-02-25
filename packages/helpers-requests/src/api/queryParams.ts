import type { LiveItemStatus } from '@podverse/helpers';
import type { QueryParamsMedium, QueryParamsQueueMedium } from '@podverse/helpers';
import type { CategoryMappingKeys } from '@podverse/helpers';

// ===== BASE CONSTANTS =====
// Shared query parameter value sets used across multiple contexts.
// These base constants eliminate duplication and serve as the single source of truth.

/** Base sort values: chronological order plus top-ranked */
export const SORT_RECENT_OLDEST_TOP = ['recent', 'oldest', 'top'] as const;

/** Base sort values: chronological order only */
export const SORT_RECENT_OLDEST = ['recent', 'oldest'] as const;

/** Base type values: global, subscribed, or category-filtered feeds */
export const TYPE_GLOBAL_SUBSCRIBED_CATEGORY = ['global', 'subscribed', 'category'] as const;

// Helpers

export const getValidQueryParam = <T extends string>(
  validParams: readonly T[],
  param: string | null,
  defaultParam: T
): T => {
  if (param && (validParams as readonly string[]).includes(param)) {
    return param as T;
  }
  return defaultParam;
};

// Global

export interface QueryParamsPage {
  page: number;
}

export type QueryParamsAccountPublic = {
  page: number;
};

export type QueryParamsAccountSubscribed = {
  page: number;
};

export type QueryParamsAccountGlobalTop = {
  page: number;
  range: QueryParamsStatsRange;
};

export type QueryParamsAccountSubscribedTop = {
  page: number;
  range: QueryParamsStatsRange;
};

export interface QueryParamsShuffle {
  page: number;
  shuffleHash: string;
}

export interface QueryParamsPageRange {
  page: number;
  range: QueryParamsStatsRange;
}

export interface QueryParamsIndividualList {
  idOrIdText: string;
  page: number;
  sort: QueryParamsSubscribedPartialSort;
  range: QueryParamsStatsRange | null;
}

export interface QueryParamsIndividualListMusic {
  idOrIdText: string;
  page: number;
  sort: QueryParamsChannelMusicAlbumSort;
  range: QueryParamsStatsRange | null;
}

export interface QueryParamsGetMany {
  page: number;
  medium: QueryParamsMedium;
  type: QueryParamsSubscribedType;
  sort: QueryParamsSubscribedFullSort;
  range: QueryParamsStatsRange | null;
  category: string | null;
}

export interface QueryParamsGetManyPartial {
  page: number;
  medium: QueryParamsMedium;
  type: QueryParamsSubscribedType;
  sort: QueryParamsSubscribedPartialSort;
  range: QueryParamsStatsRange | null;
  category: string | null;
}

export interface QueryParamsGetManyPartialMusic {
  page: number;
  medium: QueryParamsMedium;
  type: QueryParamsSubscribedMusicType;
  sort: QueryParamsSubscribedPartialSort;
  range: QueryParamsStatsRange | null;
}

export type QueryParamsGetManyLivestreams = QueryParamsGetManyPartial & {
  liveItemType: LiveItemStatus;
};

export type QueryParamsGetManyMusic = {
  page: number;
  medium: QueryParamsMedium;
  type: QueryParamsSubscribedMusicType;
  sort: QueryParamsSubscribedFullSort;
  range: QueryParamsStatsRange | null;
};

export type QueryParamsGlobalRecent = {
  page: number;
  medium: QueryParamsMedium;
};

export type QueryParamsGlobalTop = {
  page: number;
  medium: QueryParamsMedium;
  range: QueryParamsStatsRange;
};

export type QueryParamsCategoryRecent = {
  page: number;
  medium: QueryParamsMedium;
  category: CategoryMappingKeys;
};

export type QueryParamsCategoryTop = {
  page: number;
  medium: QueryParamsMedium;
  range: QueryParamsStatsRange;
  category: CategoryMappingKeys;
};

export type QueryParamsSubscribedAZ = {
  page: number;
  medium: QueryParamsMedium;
};

export type QueryParamsSubscribedRecent = {
  page: number;
  medium: QueryParamsMedium;
};

export type QueryParamsSubscribedTop = {
  page: number;
  medium: QueryParamsMedium;
  range: QueryParamsStatsRange;
};

export const QUERY_PARAMS_SUBSCRIBED_TYPE = TYPE_GLOBAL_SUBSCRIBED_CATEGORY;
export type QueryParamsSubscribedType = (typeof QUERY_PARAMS_SUBSCRIBED_TYPE)[number];

export const QUERY_PARAMS_GLOBAL_SORT_VALUES = SORT_RECENT_OLDEST_TOP;
export type QueryParamsGlobalSort = (typeof QUERY_PARAMS_GLOBAL_SORT_VALUES)[number];

export const QUERY_PARAMS_SUBSCRIBED_FULL_SORT = ['recent', 'oldest', 'a_z', 'top'] as const;
export type QueryParamsSubscribedFullSort = (typeof QUERY_PARAMS_SUBSCRIBED_FULL_SORT)[number];

export const QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT = QUERY_PARAMS_GLOBAL_SORT_VALUES;
export type QueryParamsSubscribedPartialSort =
  (typeof QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT)[number];

export const QUERY_PARAMS_SUBSCRIBED_MUSIC_TYPE = ['global', 'subscribed'] as const;
export type QueryParamsSubscribedMusicType = (typeof QUERY_PARAMS_SUBSCRIBED_MUSIC_TYPE)[number];

// Stats

export const QUERY_PARAMS_STATS_RANGE_VALUES = ['day', 'week', 'month', 'all-time'] as const;
export type QueryParamsStatsRange = (typeof QUERY_PARAMS_STATS_RANGE_VALUES)[number];

export const STATS_SORT_COLUMNS = [
  'day_current_count',
  'week_current_count',
  'month_current_count',
  'all_time_count',
] as const;
export type StatsSortColumn = (typeof STATS_SORT_COLUMNS)[number];

// Channel

export const QUERY_PARAMS_CHANNEL_TYPE_VALUES = [
  'episodes',
  'soundbites',
  'clips',
  'about',
  'podroll',
  'settings',
] as const;
export const QUERY_PARAMS_CHANNEL_SORT_VALUES = SORT_RECENT_OLDEST_TOP;

export type QueryParamsChannelType = (typeof QUERY_PARAMS_CHANNEL_TYPE_VALUES)[number];
export type QueryParamsChannelSort = (typeof QUERY_PARAMS_CHANNEL_SORT_VALUES)[number];

export interface QueryParamsChannel {
  page: number;
  type: (typeof QUERY_PARAMS_CHANNEL_TYPE_VALUES)[number];
  sort: (typeof QUERY_PARAMS_CHANNEL_SORT_VALUES)[number];
  range: QueryParamsStatsRange | null;
}

export const QUERY_PARAMS_CHANNEL_MUSIC_ARTIST_TYPE_VALUES = [
  'albums',
  'tracks',
  'about',
  'podroll',
  'settings',
] as const;

export type QueryParamsChannelMusicArtistType =
  (typeof QUERY_PARAMS_CHANNEL_MUSIC_ARTIST_TYPE_VALUES)[number];

export interface QueryParamsChannelMusicArtist {
  type: (typeof QUERY_PARAMS_CHANNEL_MUSIC_ARTIST_TYPE_VALUES)[number];
}

export const QUERY_PARAMS_CHANNEL_MUSIC_ALBUM_TYPE_VALUES = [
  'tracks',
  'about',
  'podroll',
  'settings',
] as const;
export const QUERY_PARAMS_CHANNEL_MUSIC_ALBUM_SORT_VALUES = ['forward', 'backward', 'top'] as const;

export type QueryParamsChannelMusicAlbumType =
  (typeof QUERY_PARAMS_CHANNEL_MUSIC_ALBUM_TYPE_VALUES)[number];
export type QueryParamsChannelMusicAlbumSort =
  (typeof QUERY_PARAMS_CHANNEL_MUSIC_ALBUM_SORT_VALUES)[number];

export interface QueryParamsChannelMusicAlbum {
  page: number;
  type: (typeof QUERY_PARAMS_CHANNEL_MUSIC_ALBUM_TYPE_VALUES)[number];
  sort: (typeof QUERY_PARAMS_CHANNEL_MUSIC_ALBUM_SORT_VALUES)[number];
  range: QueryParamsStatsRange | null;
}

// Channels

export interface QueryParamsChannels {
  page: number;
  type?: QueryParamsSubscribedType;
  sort?: QueryParamsSubscribedFullSort;
  range?: QueryParamsStatsRange;
  category?: CategoryMappingKeys;
  medium: QueryParamsMedium;
}

// Clips

export const QUERY_PARAMS_CLIPS_BY_CHANNEL_SORT_VALUES = SORT_RECENT_OLDEST_TOP;

export type QueryParamsClipsByChannelSort =
  (typeof QUERY_PARAMS_CLIPS_BY_CHANNEL_SORT_VALUES)[number];

export interface QueryParamsClipsByChannel {
  page: number;
  sort: QueryParamsClipsByChannelSort;
  range: QueryParamsStatsRange | null;
}

// Home

export const QUERY_PARAMS_HOME_SORT_VALUES = ['a_z', 'recent', 'oldest'] as const;

export type QueryParamsHomeSort = (typeof QUERY_PARAMS_HOME_SORT_VALUES)[number];

export interface QueryParamsHome {
  page: number;
  medium: QueryParamsMedium;
  sort: QueryParamsHomeSort;
}

// Item

export const QUERY_PARAMS_ITEM_TYPE_VALUES = [
  'summary',
  'chapters',
  'soundbites',
  'clips',
  'transcript',
] as const;
export const QUERY_PARAMS_ITEM_SORT_VALUES = SORT_RECENT_OLDEST_TOP;

export type QueryParamsItemType = (typeof QUERY_PARAMS_ITEM_TYPE_VALUES)[number];
export type QueryParamsItemSort = (typeof QUERY_PARAMS_ITEM_SORT_VALUES)[number];

export interface QueryParamsItem {
  page: number;
  type: (typeof QUERY_PARAMS_ITEM_TYPE_VALUES)[number];
  sort: (typeof QUERY_PARAMS_ITEM_SORT_VALUES)[number];
  range: QueryParamsStatsRange | null;
}

export const QUERY_PARAMS_ITEM_MUSIC_TYPE_VALUES = ['summary', 'transcript'] as const;

export type QueryParamsItemMusicType = (typeof QUERY_PARAMS_ITEM_MUSIC_TYPE_VALUES)[number];

export interface QueryParamsItemMusic {
  type: (typeof QUERY_PARAMS_ITEM_MUSIC_TYPE_VALUES)[number];
}

// Items

export const QUERY_PARAMS_ITEMS_TYPE_VALUES = TYPE_GLOBAL_SUBSCRIBED_CATEGORY;
export const QUERY_PARAMS_ITEMS_SORT_VALUES = SORT_RECENT_OLDEST_TOP;

export type QueryParamsItemsType = (typeof QUERY_PARAMS_ITEMS_TYPE_VALUES)[number];
export type QueryParamsItemsSort = (typeof QUERY_PARAMS_ITEMS_SORT_VALUES)[number];

export interface QueryParamsItems {
  page: number;
  type?: QueryParamsItemsType;
  sort?: QueryParamsItemsSort;
  range?: QueryParamsStatsRange;
  category?: CategoryMappingKeys;
}

// Item Soundbites

export const QUERY_PARAMS_ITEM_SOUNDBITES_BY_CHANNEL_SORT_VALUES = SORT_RECENT_OLDEST;

export type QueryParamsItemSoundbitesByChannelSort =
  (typeof QUERY_PARAMS_ITEM_SOUNDBITES_BY_CHANNEL_SORT_VALUES)[number];

export interface QueryParamsItemSoundbitesByChannel {
  page: number;
  sort?: QueryParamsItemSoundbitesByChannelSort;
}

export const QUERY_PARAMS_ITEM_SOUNDBITES_BY_ITEM_SORT_VALUES = SORT_RECENT_OLDEST;

export type QueryParamsItemSoundbitesByItemSort =
  (typeof QUERY_PARAMS_ITEM_SOUNDBITES_BY_ITEM_SORT_VALUES)[number];

export interface QueryParamsItemSoundbitesByItem {
  page: number;
  sort?: QueryParamsItemSoundbitesByItemSort;
}

// Live Item

export const QUERY_PARAMS_LIVE_ITEM_TYPE_VALUES = ['summary'] as const;

export type QueryParamsLiveItemType = (typeof QUERY_PARAMS_LIVE_ITEM_TYPE_VALUES)[number];

export interface QueryParamsLiveItem {
  type: (typeof QUERY_PARAMS_LIVE_ITEM_TYPE_VALUES)[number];
}

// Playlists

export const QUERY_PARAMS_PLAYLISTS_TYPE_VALUES = [
  'public',
  'private',
  'private_followed',
] as const;
export type QueryParamsPlaylistsType = (typeof QUERY_PARAMS_PLAYLISTS_TYPE_VALUES)[number];

export interface QueryParamsPlaylists {
  page: number;
  medium: QueryParamsQueueMedium;
  type: QueryParamsPlaylistsType;
  sort: QueryParamsSubscribedFullSort;
  range: QueryParamsStatsRange | null;
}

export type QueryParamsPlaylistsPublicTop = {
  page: number;
  medium: QueryParamsQueueMedium;
  range: QueryParamsStatsRange;
};

export type QueryParamsPlaylistsPrivateAZ = {
  page: number;
  medium: QueryParamsQueueMedium;
};

export type QueryParamsPlaylistsPrivateOldest = {
  page: number;
  medium: QueryParamsQueueMedium;
};

export type QueryParamsPlaylistsPrivateRecent = {
  page: number;
  medium: QueryParamsQueueMedium;
};

export type QueryParamsPlaylistsPrivateTop = {
  page: number;
  medium: QueryParamsQueueMedium;
  range: QueryParamsStatsRange;
};

export type QueryParamsPlaylistsPrivateFollowedAZ = {
  page: number;
  medium: QueryParamsQueueMedium;
};

export type QueryParamsPlaylistsPrivateFollowedOldest = {
  page: number;
  medium: QueryParamsQueueMedium;
};

export type QueryParamsPlaylistsPrivateFollowedRecent = {
  page: number;
  medium: QueryParamsQueueMedium;
};

export type QueryParamsPlaylistsPrivateFollowedTop = {
  page: number;
  medium: QueryParamsQueueMedium;
  range: QueryParamsStatsRange;
};

// Playlist Resources

export type QueryParamsPlaylistResources = QueryParamsPage;

// Queues

export type QueryParamsQueues = {
  medium: QueryParamsQueueMedium;
};

export type QueryParamsHistory = {
  page: number;
  medium: QueryParamsQueueMedium;
};

// MISC

export type QueryDirection = 'forward' | 'backward';

export type QueryParamsDirection = {
  direction: QueryDirection;
};

export const QUERY_PARAMS_DIRECTION_VALUES = ['forward', 'backward'] as const;

export type QueryParamsAutoQueueSort = 'forward' | 'backward' | 'recent' | 'oldest' | 'top';

export const getShuffleHash = (): string => {
  let out = '';
  for (let i = 0; i < 10; i++) {
    out += Math.floor(Math.random() * 10).toString();
  }
  return out;
};
