import { QueryParamsHomeSort, QueryParamsMedium } from '@podverse/helpers';

export function getHomeDropdownConfig({
  tMedia,
  tFilters,
}: {
  sort: QueryParamsHomeSort;
  medium: QueryParamsMedium;
  tMedia: (key: string) => string;
  tFilters: (key: string) => string;
}) {
  const mediumDropdownMenuItems = [
    { label: tFilters('type.all'), param: 'medium', value: 'all' },
    { label: tMedia('podcast.podcasts'), param: 'medium', value: 'av' },
    { label: tMedia('music.music'), param: 'medium', value: 'music' },
  ];

  const sortDropdownMenuItems = [
    { label: tFilters('sort.recent'), param: 'sort', value: 'recent' },
    { label: tFilters('sort.a_z'), param: 'sort', value: 'a_z' },
  ];

  return {
    mediumMenuItems: mediumDropdownMenuItems,
    sortMenuItems: sortDropdownMenuItems,
  };
}

type HomeDropdownConfigParams = {
  medium: QueryParamsMedium;
  sort: QueryParamsHomeSort;
  page: number;
};

export type HomeDropdownConfigCurrentParams = {
  currentMedium: QueryParamsMedium;
  currentSort: QueryParamsHomeSort;
  currentPage: number;
};

export function getHomeFilterParams({
  medium,
  sort,
  page,
}: HomeDropdownConfigParams): HomeDropdownConfigCurrentParams {
  const currentMedium = medium;
  const currentSort = sort;
  const currentPage = page;

  return { currentSort, currentMedium, currentPage };
}
