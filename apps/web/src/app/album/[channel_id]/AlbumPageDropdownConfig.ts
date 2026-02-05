import type {
  QueryParamsStatsRange,
  QueryParamsChannelMusicAlbumSort,
  QueryParamsChannelMusicAlbumType,
} from '@podverse/helpers-requests';
import { getRangeDropdownItems } from '../../../utils/dropdownMenuItems';

export function getAlbumPageDropdownConfig({
  sort,
  tFilters,
}: {
  sort: QueryParamsChannelMusicAlbumSort;
  tFilters: (key: string) => string;
  tMedia: (key: string) => string;
}) {
  const sortDropdownMenuItems = [
    { label: tFilters('sort.forward'), param: 'sort', value: 'forward' },
    { label: tFilters('sort.backward'), param: 'sort', value: 'backward' },
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

type AlbumPageDropdownConfigParams = {
  type: QueryParamsChannelMusicAlbumType;
  sort: QueryParamsChannelMusicAlbumSort;
  range: QueryParamsStatsRange | null;
  page: number;
};

export type AlbumPageDropdownConfigCurrentParams = {
  currentType: QueryParamsChannelMusicAlbumType;
  currentSort: QueryParamsChannelMusicAlbumSort;
  currentRange: QueryParamsStatsRange | null;
  currentPage: number;
};

export function getAlbumPageFilterParams({
  type,
  sort,
  range,
  page,
}: AlbumPageDropdownConfigParams): AlbumPageDropdownConfigCurrentParams {
  const currentType = type;
  const currentSort = sort;
  const currentRange = range;
  const currentPage = page;

  return { currentSort, currentRange, currentType, currentPage };
}
