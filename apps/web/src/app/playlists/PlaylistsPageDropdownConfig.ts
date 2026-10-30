import type { QueryParamsQueueMedium } from '@podverse/helpers';

/** Playlists of every medium. A stored `av` or `music` choice overrides this. */
export const DEFAULT_PLAYLISTS_PAGE_MEDIUM: QueryParamsQueueMedium = 'all';
import type {
  QueryParamsPlaylistsType,
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
} from '@podverse/helpers-requests';
import { getValidQueryParam, QUERY_PARAMS_SUBSCRIBED_FULL_SORT } from '@podverse/helpers-requests';

export function getPlaylistsPageSortOptions({
  type,
  tFilters,
}: {
  type: QueryParamsPlaylistsType;
  tFilters: (key: string) => string;
}): { label: string; value: QueryParamsSubscribedFullSort }[] {
  if (type === 'public') {
    return [
      { label: tFilters('sort.recent'), value: 'recent' },
      { label: tFilters('sort.top'), value: 'top' },
    ];
  }
  return [
    { label: tFilters('sort.top'), value: 'top' },
    { label: tFilters('sort.a_z'), value: 'a_z' },
    { label: tFilters('sort.recent'), value: 'recent' },
    { label: tFilters('sort.oldest'), value: 'oldest' },
  ];
}

type PlaylistsPageDropdownConfigParams = {
  type: QueryParamsPlaylistsType | null;
  sort: QueryParamsSubscribedFullSort | null;
  range: QueryParamsStatsRange | null;
  medium: QueryParamsQueueMedium;
  page: number;
};

export type PlaylistsPageDropdownConfigCurrentParams = {
  currentType: QueryParamsPlaylistsType;
  currentSort: QueryParamsSubscribedFullSort;
  currentRange: QueryParamsStatsRange | null;
  currentMedium: QueryParamsQueueMedium;
  currentPage: number;
};

export function getPlaylistsPageFilterParams(
  { type, sort, range, medium, page }: PlaylistsPageDropdownConfigParams,
  isValidAuthSession: boolean
): PlaylistsPageDropdownConfigCurrentParams {
  let currentType: QueryParamsPlaylistsType;
  let currentSort = sort;
  const currentRange = range;
  const currentMedium = medium;
  const currentPage = page;

  if (type === 'private') {
    currentType = 'private';
    currentSort = getValidQueryParam(QUERY_PARAMS_SUBSCRIBED_FULL_SORT, currentSort, 'a_z');
  } else if (type === 'public') {
    currentType = 'public';
    currentSort = getValidQueryParam(QUERY_PARAMS_SUBSCRIBED_FULL_SORT, currentSort, 'recent');
  } else if (type === 'private_followed') {
    currentType = 'private_followed';
    currentSort = getValidQueryParam(QUERY_PARAMS_SUBSCRIBED_FULL_SORT, currentSort, 'a_z');
  } else {
    if (isValidAuthSession) {
      currentType = 'private';
      currentSort = getValidQueryParam(QUERY_PARAMS_SUBSCRIBED_FULL_SORT, currentSort, 'a_z');
    } else {
      currentType = 'public';
      currentSort = getValidQueryParam(QUERY_PARAMS_SUBSCRIBED_FULL_SORT, currentSort, 'recent');
    }
  }

  return { currentType, currentSort, currentRange, currentMedium, currentPage };
}
