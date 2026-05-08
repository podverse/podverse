import type { CategoryMappingKeys, LiveItemStatus } from '@podverse/helpers';
import type {
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
  QueryParamsSubscribedPartialSort,
  QueryParamsSubscribedType,
} from '@podverse/helpers-requests';
import {
  QUERY_PARAMS_GLOBAL_SORT_VALUES,
  QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT,
} from '@podverse/helpers-requests';

import {
  buildSubscribedListDropdownConfig,
  buildSubscribedListFilterParams,
} from '../../../utils/dropdownMenuItems';

export function getLivestreamsPageDropdownConfig({
  type,
  sort,
  tFilters,
}: {
  sort: QueryParamsSubscribedFullSort;
  type: QueryParamsSubscribedType;
  tFilters: (key: string) => string;
}) {
  return buildSubscribedListDropdownConfig({
    categorySorts: [
      { label: tFilters('sort.recent'), value: 'recent' },
      { label: tFilters('sort.top'), value: 'top' },
    ],
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
      { label: tFilters('type.category'), value: 'category' },
    ],
  });
}

type LivestreamsPageDropdownConfigParams = {
  type: QueryParamsSubscribedType | null;
  sort: QueryParamsSubscribedPartialSort | null;
  range: QueryParamsStatsRange | null;
  category: CategoryMappingKeys | null;
  page: number;
  liveItemType: LiveItemStatus;
};

export type LivestreamsPageDropdownConfigCurrentParams = {
  currentType: QueryParamsSubscribedType;
  currentSort: QueryParamsSubscribedPartialSort;
  currentRange: QueryParamsStatsRange | null;
  currentCategory: CategoryMappingKeys | null;
  currentPage: number;
  currentLiveItemType: LiveItemStatus;
};

export function getLivestreamsPageFilterParams(
  params: LivestreamsPageDropdownConfigParams,
  isValidAuthSession: boolean
): LivestreamsPageDropdownConfigCurrentParams {
  const { liveItemType, ...filterArgs } = params;
  return {
    ...buildSubscribedListFilterParams({
      ...filterArgs,
      defaultGlobalSort: 'recent',
      defaultSubscribedSort: 'recent',
      globalSortValues: QUERY_PARAMS_GLOBAL_SORT_VALUES,
      isValidAuthSession,
      subscribedSortValues: QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT,
      supportsCategory: true,
    }),
    currentLiveItemType: liveItemType,
  };
}
