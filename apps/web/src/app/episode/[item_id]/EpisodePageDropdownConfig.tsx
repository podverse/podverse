import type {
  QueryParamsItemSort,
  QueryParamsItemType,
  QueryParamsStatsRange,
} from '@podverse/helpers-requests';

import { getRangeDropdownItems } from '../../../utils/dropdownMenuItems';

export function getEpisodePageDropdownConfig({
  sort,
  tFilters,
}: {
  sort: QueryParamsItemSort;
  tFilters: (key: string) => string;
}) {
  const sortDropdownMenuItems = [
    { label: tFilters('sort.recent'), param: 'sort', value: 'recent' },
    { label: tFilters('sort.oldest'), param: 'sort', value: 'oldest' },
    { label: tFilters('sort.top'), param: 'sort', value: 'top' },
  ];

  const rangeDropdownMenuItems = getRangeDropdownItems(tFilters);

  const showRangeDropdown = sort === 'top';

  return {
    sortMenuItems: sortDropdownMenuItems,
    rangeMenuItems: rangeDropdownMenuItems,
    showRangeDropdown,
  };
}

type EpisodePageDropdownConfigParams = {
  type: QueryParamsItemType;
  sort: QueryParamsItemSort;
  range: QueryParamsStatsRange | null;
  page: number;
};

export type EpisodePageDropdownConfigCurrentParams = {
  currentType: QueryParamsItemType;
  currentSort: QueryParamsItemSort;
  currentRange: QueryParamsStatsRange | null;
  currentPage: number;
};

export function getEpisodePageFilterParams({
  type,
  sort,
  range,
  page,
}: EpisodePageDropdownConfigParams): EpisodePageDropdownConfigCurrentParams {
  let currentSort = sort;
  const currentRange = range;
  const currentType = type;
  const currentPage = page;

  if (type === 'soundbites') {
    if (sort === 'top') {
      currentSort = 'recent';
    }
  }

  return { currentSort, currentRange, currentType, currentPage };
}
