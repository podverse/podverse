import type { CategoryMappingKeys, SortPrefScope } from '@podverse/helpers';
import {
  BROWSE_LIST_VIEW_MODE_SCOPE_PODCASTS,
  HOME_LIST_VIEW_MODE_SCOPE_PODCASTS,
} from '@podverse/helpers';
import type {
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
  QueryParamsSubscribedType,
} from '@podverse/helpers-requests';
import {
  QUERY_PARAMS_GLOBAL_SORT_VALUES,
  QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
} from '@podverse/helpers-requests';

import { buildSubscribedListFilterParams } from '../../../utils/dropdownMenuItems';
import type { MediaListScope } from '../../../utils/mediaListChips';

export function podcastsListViewModeScope(scope: MediaListScope): SortPrefScope {
  return scope === 'subscribed'
    ? HOME_LIST_VIEW_MODE_SCOPE_PODCASTS
    : BROWSE_LIST_VIEW_MODE_SCOPE_PODCASTS;
}

export function getPodcastsPageSortOptions({
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
  isValidAuthSession: boolean,
  scope: MediaListScope
): PodcastsPageDropdownConfigCurrentParams {
  return buildSubscribedListFilterParams({
    ...params,
    defaultGlobalSort: 'top',
    defaultSubscribedSort: 'a_z',
    globalSortValues: QUERY_PARAMS_GLOBAL_SORT_VALUES,
    isValidAuthSession,
    scope,
    subscribedSortValues: QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
    supportsCategory: true,
  });
}
