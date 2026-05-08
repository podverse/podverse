import type { CategoryMappingKeys } from '@podverse/helpers';
import type {
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
  QueryParamsSubscribedType,
} from '@podverse/helpers-requests';
import {
  QUERY_PARAMS_GLOBAL_SORT_VALUES,
  QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
} from '@podverse/helpers-requests';

import {
  buildSubscribedListDropdownConfig,
  buildSubscribedListFilterParams,
} from '../../utils/dropdownMenuItems';

export function getPodcastsPageDropdownConfig({
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
      { label: tFilters('sort.a_z'), value: 'a_z' },
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

type PodcastsPageDropdownConfigParams = {
  type: QueryParamsSubscribedType | null;
  sort: QueryParamsSubscribedFullSort | null;
  range: QueryParamsStatsRange | null;
  category: CategoryMappingKeys | null;
  page: number;
};

export type PodcastsPageDropdownConfigCurrentParams = {
  currentType: QueryParamsSubscribedType;
  currentSort: QueryParamsSubscribedFullSort;
  currentRange: QueryParamsStatsRange | null;
  currentCategory: CategoryMappingKeys | null;
  currentPage: number;
};

export function getPodcastsPageFilterParams(
  params: PodcastsPageDropdownConfigParams,
  isValidAuthSession: boolean
): PodcastsPageDropdownConfigCurrentParams {
  return buildSubscribedListFilterParams({
    ...params,
    defaultGlobalSort: 'recent',
    defaultSubscribedSort: 'a_z',
    globalSortValues: QUERY_PARAMS_GLOBAL_SORT_VALUES,
    isValidAuthSession,
    subscribedSortValues: QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
    supportsCategory: true,
  });
}
