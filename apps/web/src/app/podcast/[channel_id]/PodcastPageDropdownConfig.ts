import type {
  QueryParamsChannelType,
  QueryParamsChannelSort,
  QueryParamsStatsRange,
  QueryParamsGlobalSort,
} from '@podverse/helpers-requests';
import { getRangeDropdownItems } from '../../../utils/dropdownMenuItems';

export function getPodcastPageDropdownConfig({
  sort,
  tFilters,
}: {
  sort: QueryParamsChannelSort;
  tFilters: (key: string) => string;
  tMedia: (key: string) => string;
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

type PodcastPageDropdownConfigParams = {
  type: QueryParamsChannelType;
  sort: QueryParamsGlobalSort;
  range: QueryParamsStatsRange | null;
  page: number;
};

export type PodcastPageDropdownConfigCurrentParams = {
  currentType: QueryParamsChannelType;
  currentSort: QueryParamsGlobalSort;
  currentRange: QueryParamsStatsRange | null;
  currentPage: number;
};

export function getPodcastPageFilterParams({
  type,
  sort,
  range,
  page,
}: PodcastPageDropdownConfigParams): PodcastPageDropdownConfigCurrentParams {
  const currentType = type;
  const currentSort = sort;
  const currentRange = range;
  const currentPage = page;

  return { currentSort, currentRange, currentType, currentPage };
}
