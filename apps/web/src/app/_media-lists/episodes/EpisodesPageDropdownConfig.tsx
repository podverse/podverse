import type { CategoryMappingKeys } from '@podverse/helpers';
import type {
  QueryParamsStatsRange,
  QueryParamsSubscribedPartialSort,
  QueryParamsSubscribedType,
} from '@podverse/helpers-requests';
import {
  QUERY_PARAMS_GLOBAL_SORT_VALUES,
  QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT,
} from '@podverse/helpers-requests';

import { buildSubscribedListFilterParams } from '../../../utils/dropdownMenuItems';
import type { MediaListScope } from '../../../utils/mediaListChips';

export function getEpisodesPageSortOptions(
  tFilters: (key: string) => string
): { label: string; value: QueryParamsSubscribedPartialSort }[] {
  return [
    { label: tFilters('sort.recent'), value: 'recent' },
    { label: tFilters('sort.top'), value: 'top' },
  ];
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
  isValidAuthSession: boolean,
  scope?: MediaListScope
): EpisodesPageDropdownConfigCurrentParams {
  return buildSubscribedListFilterParams({
    ...params,
    defaultGlobalSort: 'top',
    defaultSubscribedSort: 'recent',
    globalSortValues: QUERY_PARAMS_GLOBAL_SORT_VALUES,
    isValidAuthSession,
    scope,
    subscribedSortValues: QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT,
    supportsCategory: true,
  });
}
