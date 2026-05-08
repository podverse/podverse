import type { CategoryMappingKeys } from '@podverse/helpers';
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
} from '../../utils/dropdownMenuItems';

export function getEpisodesPageDropdownConfig({
  type,
  sort,
  tFilters,
  medium,
}: {
  sort: QueryParamsSubscribedFullSort;
  type: QueryParamsSubscribedType;
  tFilters: (key: string) => string;
  medium?: 'av' | 'music';
}) {
  const typeOptions: { label: string; value: QueryParamsSubscribedType }[] = [
    { label: tFilters('type.global'), value: 'global' },
    { label: tFilters('type.subscribed'), value: 'subscribed' },
  ];

  if (!medium || medium === 'av') {
    typeOptions.push({
      label: tFilters('type.category'),
      value: 'category',
    });
  }

  const categorySorts = [
    { label: tFilters('sort.recent'), value: 'recent' as const },
    { label: tFilters('sort.top'), value: 'top' as const },
  ];

  return buildSubscribedListDropdownConfig({
    categorySorts,
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
    typeOptions,
  });
}

type EpisodesPageDropdownConfigParams = {
  type: QueryParamsSubscribedType | null;
  sort: QueryParamsSubscribedPartialSort | null;
  range: QueryParamsStatsRange | null;
  category: CategoryMappingKeys | null;
  page: number;
};

export type EpisodesPageDropdownConfigCurrentParams = {
  currentType: QueryParamsSubscribedType;
  currentSort: QueryParamsSubscribedPartialSort;
  currentRange: QueryParamsStatsRange | null;
  currentCategory: CategoryMappingKeys | null;
  currentPage: number;
};

export function getEpisodesPageFilterParams(
  params: EpisodesPageDropdownConfigParams,
  isValidAuthSession: boolean
): EpisodesPageDropdownConfigCurrentParams {
  return buildSubscribedListFilterParams({
    ...params,
    defaultGlobalSort: 'recent',
    defaultSubscribedSort: 'recent',
    globalSortValues: QUERY_PARAMS_GLOBAL_SORT_VALUES,
    isValidAuthSession,
    subscribedSortValues: QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT,
    supportsCategory: true,
  });
}
