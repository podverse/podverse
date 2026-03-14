import type {
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
  QueryParamsSubscribedMusicType,
  QueryParamsSubscribedPartialSort,
} from '@podverse/helpers-requests';
import {
  getValidQueryParam,
  QUERY_PARAMS_GLOBAL_SORT_VALUES,
  QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT,
} from '@podverse/helpers-requests';

import type { DropdownMenuItem } from '../../components/Dropdown/Dropdown';
import { getRangeDropdownItems } from '../../utils/dropdownMenuItems';

export function getTracksPageDropdownConfig({
  type,
  sort,
  tFilters,
}: {
  sort: QueryParamsSubscribedFullSort;
  type: QueryParamsSubscribedMusicType;
  tFilters: (key: string) => string;
}) {
  const typeDropdownMenuItems: DropdownMenuItem[] = [
    { label: tFilters('type.global'), param: 'type', value: 'global' },
    { label: tFilters('type.subscribed'), param: 'type', value: 'subscribed' },
  ];
  let sortDropdownMenuItems: DropdownMenuItem[] = [];
  const rangeDropdownMenuItems = getRangeDropdownItems(tFilters);
  let showRangeDropdown = false;

  if (type === 'global') {
    sortDropdownMenuItems = [
      { label: tFilters('sort.recent'), param: 'sort', value: 'recent' },
      { label: tFilters('sort.top'), param: 'sort', value: 'top' },
    ];
  } else if (type === 'subscribed') {
    sortDropdownMenuItems = [
      { label: tFilters('sort.recent'), param: 'sort', value: 'recent' },
      { label: tFilters('sort.top'), param: 'sort', value: 'top' },
    ];
  }

  if (sort === 'top') {
    showRangeDropdown = true;
  }

  return {
    typeMenuItems: typeDropdownMenuItems,
    sortMenuItems: sortDropdownMenuItems,
    rangeMenuItems: rangeDropdownMenuItems,
    showRangeDropdown,
  };
}

type TracksPageDropdownConfigParams = {
  type: QueryParamsSubscribedMusicType | null;
  sort: QueryParamsSubscribedPartialSort | null;
  range: QueryParamsStatsRange | null;
  page: number;
};

export type TracksPageDropdownConfigCurrentParams = {
  currentType: QueryParamsSubscribedMusicType;
  currentSort: QueryParamsSubscribedPartialSort;
  currentRange: QueryParamsStatsRange | null;
  currentPage: number;
};

export function getTracksPageFilterParams(
  { type, sort, range, page }: TracksPageDropdownConfigParams,
  isValidAuthSession: boolean
): TracksPageDropdownConfigCurrentParams {
  let currentType: QueryParamsSubscribedMusicType;
  let currentSort = sort;
  let currentRange = range;
  let currentPage = page;

  if (type === 'global') {
    currentType = 'global';
    currentSort = getValidQueryParam(QUERY_PARAMS_GLOBAL_SORT_VALUES, currentSort, 'recent');
  } else if (type === 'subscribed') {
    currentType = 'subscribed';
    currentSort = getValidQueryParam(QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT, currentSort, 'recent');
  } else {
    if (isValidAuthSession) {
      currentType = 'subscribed';
      currentSort = getValidQueryParam(QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT, currentSort, 'recent');
      currentRange = null;
      currentPage = 1;
    } else {
      currentType = 'global';
      currentSort = getValidQueryParam(QUERY_PARAMS_GLOBAL_SORT_VALUES, currentSort, 'recent');
      currentRange = null;
      currentPage = 1;
    }
  }

  return { currentType, currentSort, currentRange, currentPage };
}
