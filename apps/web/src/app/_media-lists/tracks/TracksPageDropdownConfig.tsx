import type {
  QueryParamsStatsRange,
  QueryParamsSubscribedMusicType,
  QueryParamsSubscribedPartialSort,
} from '@podverse/helpers-requests';
import {
  QUERY_PARAMS_GLOBAL_SORT_VALUES,
  QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT,
} from '@podverse/helpers-requests';

import { buildSubscribedListFilterParams } from '../../../utils/dropdownMenuItems';
import type { MediaListScope } from '../../../utils/mediaListChips';

export function getTracksPageSortOptions(
  tFilters: (key: string) => string
): { label: string; value: QueryParamsSubscribedPartialSort }[] {
  return [
    { label: tFilters('sort.recent'), value: 'recent' },
    { label: tFilters('sort.top'), value: 'top' },
  ];
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
  isValidAuthSession: boolean,
  scope: MediaListScope
): TracksPageDropdownConfigCurrentParams {
  return buildSubscribedListFilterParams({
    ...params,
    defaultGlobalSort: 'top',
    defaultSubscribedSort: 'recent',
    globalSortValues: QUERY_PARAMS_GLOBAL_SORT_VALUES,
    isValidAuthSession,
    scope,
    subscribedSortValues: QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT,
    supportsCategory: false,
  });
}
