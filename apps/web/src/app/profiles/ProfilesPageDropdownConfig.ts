import type {
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
  QueryParamsSubscribedType,
} from '@podverse/helpers-requests';
import {
  QUERY_PARAMS_GLOBAL_SORT_VALUES,
  QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
} from '@podverse/helpers-requests';

import { buildSubscribedListFilterParams } from '../../utils/dropdownMenuItems';

export function getProfilesPageSortOptions({
  type,
  tFilters,
}: {
  type: QueryParamsSubscribedType;
  tFilters: (key: string) => string;
}): { label: string; value: QueryParamsSubscribedFullSort }[] {
  const recentAndTop: { label: string; value: QueryParamsSubscribedFullSort }[] = [
    { label: tFilters('sort.recent'), value: 'recent' },
    { label: tFilters('sort.top'), value: 'top' },
  ];
  return type === 'subscribed'
    ? [{ label: tFilters('sort.a_z'), value: 'a_z' }, ...recentAndTop]
    : recentAndTop;
}

type ProfilesPageDropdownConfigParams = {
  type: QueryParamsSubscribedType | null;
  sort: QueryParamsSubscribedFullSort | null;
  range: QueryParamsStatsRange | null;
  page: number;
};

export type ProfilesPageDropdownConfigCurrentParams = {
  currentType: QueryParamsSubscribedType;
  currentSort: QueryParamsSubscribedFullSort;
  currentRange: QueryParamsStatsRange | null;
  currentPage: number;
};

export function getProfilesPageFilterParams(
  params: ProfilesPageDropdownConfigParams,
  isValidAuthSession: boolean,
  listScope: 'page' | 'browse'
): ProfilesPageDropdownConfigCurrentParams {
  return buildSubscribedListFilterParams({
    ...params,
    defaultGlobalSort: listScope === 'browse' ? 'top' : 'recent',
    defaultSubscribedSort: 'a_z',
    globalSortValues: QUERY_PARAMS_GLOBAL_SORT_VALUES,
    isValidAuthSession,
    subscribedSortValues: QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
    supportsCategory: false,
  });
}
