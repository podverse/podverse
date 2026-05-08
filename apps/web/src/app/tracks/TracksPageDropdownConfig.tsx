import type {
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
  QueryParamsSubscribedMusicType,
  QueryParamsSubscribedPartialSort,
} from '@podverse/helpers-requests';
import {
  QUERY_PARAMS_GLOBAL_SORT_VALUES,
  QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT,
} from '@podverse/helpers-requests';

import {
  buildSubscribedListDropdownConfig,
  buildSubscribedListFilterParams,
} from '../../utils/dropdownMenuItems';

export function getTracksPageDropdownConfig({
  type,
  sort,
  tFilters,
}: {
  sort: QueryParamsSubscribedFullSort;
  type: QueryParamsSubscribedMusicType;
  tFilters: (key: string) => string;
}) {
  return buildSubscribedListDropdownConfig({
    globalSorts: [
      { label: tFilters('sort.recent'), value: 'recent' },
      { label: tFilters('sort.top'), value: 'top' },
    ],
    showRangeWhenSort: 'top',
    sort,
    subscribedSorts: [
      { label: tFilters('sort.recent'), value: 'recent' },
      { label: tFilters('sort.top'), value: 'top' },
    ],
    tFilters,
    type,
    typeOptions: [
      { label: tFilters('type.global'), value: 'global' },
      { label: tFilters('type.subscribed'), value: 'subscribed' },
    ],
  });
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
  params: TracksPageDropdownConfigParams,
  isValidAuthSession: boolean
): TracksPageDropdownConfigCurrentParams {
  return buildSubscribedListFilterParams({
    ...params,
    defaultGlobalSort: 'recent',
    defaultSubscribedSort: 'recent',
    globalSortValues: QUERY_PARAMS_GLOBAL_SORT_VALUES,
    isValidAuthSession,
    subscribedSortValues: QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT,
    supportsCategory: false,
  });
}
