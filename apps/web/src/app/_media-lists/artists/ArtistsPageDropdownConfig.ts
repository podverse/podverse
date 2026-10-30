import type { SortPrefScope } from '@podverse/helpers';
import {
  BROWSE_LIST_VIEW_MODE_SCOPE_ARTISTS,
  HOME_LIST_VIEW_MODE_SCOPE_ARTISTS,
} from '@podverse/helpers';
import type {
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
  QueryParamsSubscribedMusicType,
} from '@podverse/helpers-requests';
import {
  QUERY_PARAMS_GLOBAL_SORT_VALUES,
  QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
} from '@podverse/helpers-requests';

import { buildSubscribedListFilterParams } from '../../../utils/dropdownMenuItems';
import type { MediaListScope } from '../../../utils/mediaListChips';

export function artistsListViewModeScope(scope: MediaListScope): SortPrefScope {
  return scope === 'subscribed'
    ? HOME_LIST_VIEW_MODE_SCOPE_ARTISTS
    : BROWSE_LIST_VIEW_MODE_SCOPE_ARTISTS;
}

export function getArtistsPageSortOptions({
  type,
  tFilters,
}: {
  type: QueryParamsSubscribedMusicType;
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
  isValidAuthSession: boolean,
  scope: MediaListScope
): ArtistsPageDropdownConfigCurrentParams {
  return buildSubscribedListFilterParams({
    ...params,
    defaultGlobalSort: 'top',
    defaultSubscribedSort: 'a_z',
    globalSortValues: QUERY_PARAMS_GLOBAL_SORT_VALUES,
    isValidAuthSession,
    scope,
    subscribedSortValues: QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
    supportsCategory: false,
  });
}
