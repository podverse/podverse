import type {
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
  QueryParamsSubscribedType,
} from '@podverse/helpers-requests';
import {
  getValidQueryParam,
  QUERY_PARAMS_GLOBAL_SORT_VALUES,
  QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
} from '@podverse/helpers-requests';
import { getRangeDropdownItems } from '../../utils/dropdownMenuItems';
import type { DropdownMenuItem } from '../../components/Dropdown/Dropdown';

export function getProfilesPageDropdownConfig({
  type,
  sort,
  tFilters,
}: {
  sort: QueryParamsSubscribedFullSort;
  type: QueryParamsSubscribedType;
  tFilters: (key: string) => string;
}) {
  const typeDropdownMenuItems: DropdownMenuItem[] = [
    { label: tFilters('type.global'), param: 'type', value: 'global' },
    { label: tFilters('type.subscribed'), param: 'type', value: 'subscribed' },
  ];
  let sortDropdownMenuItems: DropdownMenuItem[] = [];
  const rangeDropdownMenuItems = getRangeDropdownItems(tFilters);
  let showRangeDropdown = false;

  if (type === 'global') {
    sortDropdownMenuItems = [
      { label: tFilters('sort.recent'), param: 'sort', value: 'recent' },
      { label: tFilters('sort.top'), param: 'sort', value: 'top' },
    ];
  } else if (type === 'subscribed') {
    sortDropdownMenuItems = [
      { label: tFilters('sort.a_z'), param: 'sort', value: 'a_z' },
      { label: tFilters('sort.recent'), param: 'sort', value: 'recent' },
      { label: tFilters('sort.top'), param: 'sort', value: 'top' },
    ];
  }

  if (sort === 'top') {
    showRangeDropdown = true;
  }

  return {
    typeMenuItems: typeDropdownMenuItems,
    sortMenuItems: sortDropdownMenuItems,
    rangeMenuItems: rangeDropdownMenuItems,
    showRangeDropdown,
  };
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
  { type, sort, range, page }: ProfilesPageDropdownConfigParams,
  isValidAuthSession: boolean
): ProfilesPageDropdownConfigCurrentParams {
  let currentType: QueryParamsSubscribedType;
  let currentSort = sort;
  let currentRange = range;
  let currentPage = page;

  if (type === 'global') {
    currentType = 'global';
    currentSort = getValidQueryParam(QUERY_PARAMS_GLOBAL_SORT_VALUES, currentSort, 'recent');
  } else if (type === 'subscribed') {
    currentType = 'subscribed';
    currentSort = getValidQueryParam(QUERY_PARAMS_SUBSCRIBED_FULL_SORT, currentSort, 'a_z');
  } else {
    if (isValidAuthSession) {
      currentType = 'subscribed';
      currentSort = getValidQueryParam(QUERY_PARAMS_SUBSCRIBED_FULL_SORT, currentSort, 'a_z');
      currentRange = null;
      currentPage = 1;
    } else {
      currentType = 'global';
      currentSort = getValidQueryParam(QUERY_PARAMS_GLOBAL_SORT_VALUES, currentSort, 'recent');
      currentRange = null;
      currentPage = 1;
    }
  }

  return { currentType, currentSort, currentRange, currentPage };
}
