import type {
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
  QueryParamsSubscribedMusicType,
} from '@podverse/helpers-requests';
import {
  QUERY_PARAMS_GLOBAL_SORT_VALUES,
  QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
} from '@podverse/helpers-requests';

import {
  buildSubscribedListDropdownConfig,
  buildSubscribedListFilterParams,
} from '../../utils/dropdownMenuItems';

export function getArtistsPageDropdownConfig({
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
      { label: tFilters('sort.a_z'), value: 'a_z' },
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

type ArtistsPageDropdownConfigParams = {
  type: QueryParamsSubscribedMusicType | null;
  sort: QueryParamsSubscribedFullSort | null;
  range: QueryParamsStatsRange | null;
  page: number;
};

export type ArtistsPageDropdownConfigCurrentParams = {
  currentType: QueryParamsSubscribedMusicType;
  currentSort: QueryParamsSubscribedFullSort;
  currentRange: QueryParamsStatsRange | null;
  currentPage: number;
};

export function getArtistsPageFilterParams(
  params: ArtistsPageDropdownConfigParams,
  isValidAuthSession: boolean
): ArtistsPageDropdownConfigCurrentParams {
  return buildSubscribedListFilterParams({
    ...params,
    defaultGlobalSort: 'recent',
    defaultSubscribedSort: 'a_z',
    globalSortValues: QUERY_PARAMS_GLOBAL_SORT_VALUES,
    isValidAuthSession,
    subscribedSortValues: QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
    supportsCategory: false,
  });
}
