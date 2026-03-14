import type { QueryParamsQueueMedium } from '@podverse/helpers';
import type {
  QueryParamsPlaylistsType,
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
} from '@podverse/helpers-requests';
import { getValidQueryParam, QUERY_PARAMS_SUBSCRIBED_FULL_SORT } from '@podverse/helpers-requests';

import { getRangeDropdownItems } from '../../utils/dropdownMenuItems';

type GetPlaylistsPageDropdownConfig = {
  sort: QueryParamsSubscribedFullSort;
  type: QueryParamsPlaylistsType;
  tFilters: (key: string) => string;
};

export function getPlaylistsPageDropdownConfig({
  sort,
  type,
  tFilters,
}: GetPlaylistsPageDropdownConfig) {
  let sortDropdownMenuItems = [{ label: tFilters('sort.top'), param: 'sort', value: 'top' }];

  if (type === 'public') {
    sortDropdownMenuItems = [{ label: tFilters('sort.top'), param: 'sort', value: 'top' }];
  } else if (type === 'private' || type === 'private_followed') {
    sortDropdownMenuItems = [
      { label: tFilters('sort.top'), param: 'sort', value: 'top' },
      { label: tFilters('sort.a_z'), param: 'sort', value: 'a_z' },
      { label: tFilters('sort.recent'), param: 'sort', value: 'recent' },
      { label: tFilters('sort.oldest'), param: 'sort', value: 'oldest' },
    ];
  }

  const rangeDropdownMenuItems = getRangeDropdownItems(tFilters);

  let showRangeDropdown = false;
  if (sort === 'top') {
    showRangeDropdown = true;
  }

  return {
    sortMenuItems: sortDropdownMenuItems,
    rangeMenuItems: rangeDropdownMenuItems,
    showRangeDropdown,
  };
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
