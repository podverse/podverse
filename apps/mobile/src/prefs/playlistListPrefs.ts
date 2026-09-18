import type { SortPrefScope } from '@podverse/helpers';
import { pickSortPrefToken } from '@podverse/helpers';
import type {
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
} from '@podverse/helpers-requests';
import {
  QUERY_PARAMS_STATS_RANGE_VALUES,
  QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
} from '@podverse/helpers-requests';

import { readSortPref, writeSortPref } from './sortPrefs';

const PLAYLIST_LIST_SCOPE: SortPrefScope = { kind: 'list', name: 'library-playlists' };

export const PLAYLIST_LIST_TYPES = ['private', 'private_followed'] as const;
export type PlaylistListType = (typeof PLAYLIST_LIST_TYPES)[number];

export const PLAYLIST_LIST_SORT_OPTIONS = QUERY_PARAMS_SUBSCRIBED_FULL_SORT;
export type PlaylistListSort = QueryParamsSubscribedFullSort;

export const PLAYLIST_LIST_RANGE_OPTIONS = QUERY_PARAMS_STATS_RANGE_VALUES;
export type PlaylistListRange = QueryParamsStatsRange;

export const DEFAULT_PLAYLIST_LIST_TYPE: PlaylistListType = 'private';
export const DEFAULT_PLAYLIST_LIST_SORT: PlaylistListSort = 'recent';
export const DEFAULT_PLAYLIST_LIST_RANGE: PlaylistListRange = 'week';

const isPlaylistListType = (value: string): value is PlaylistListType => {
  return PLAYLIST_LIST_TYPES.some((candidate) => candidate === value);
};

export type PlaylistListPrefs = {
  range: PlaylistListRange;
  sort: PlaylistListSort;
  type: PlaylistListType;
};

export const readPlaylistListPrefs = async (): Promise<PlaylistListPrefs> => {
  const stored = await readSortPref(PLAYLIST_LIST_SCOPE);

  const type =
    stored?.type !== undefined && isPlaylistListType(stored.type)
      ? stored.type
      : DEFAULT_PLAYLIST_LIST_TYPE;
  const sort = pickSortPrefToken(
    stored?.sort,
    PLAYLIST_LIST_SORT_OPTIONS,
    DEFAULT_PLAYLIST_LIST_SORT
  );
  const range = pickSortPrefToken(
    stored?.range,
    PLAYLIST_LIST_RANGE_OPTIONS,
    DEFAULT_PLAYLIST_LIST_RANGE
  );

  return { range, sort, type };
};

export const writePlaylistListType = async (type: PlaylistListType): Promise<void> => {
  await writeSortPref(PLAYLIST_LIST_SCOPE, { type });
};

export const writePlaylistListSort = async (sort: PlaylistListSort): Promise<void> => {
  await writeSortPref(PLAYLIST_LIST_SCOPE, { sort });
};

export const writePlaylistListRange = async (range: PlaylistListRange): Promise<void> => {
  await writeSortPref(PLAYLIST_LIST_SCOPE, { range, sort: 'top' });
};
