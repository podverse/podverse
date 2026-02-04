import type { QueryParamsMedium } from '@podverse/helpers';
import type { QueryParamsHomeSort } from '@podverse/helpers-requests';

export function getHomePageDropdownConfig({
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

type HomePageDropdownConfigParams = {
  medium: QueryParamsMedium;
  sort: QueryParamsHomeSort;
  page: number;
};

export type HomePageDropdownConfigCurrentParams = {
  currentMedium: QueryParamsMedium;
  currentSort: QueryParamsHomeSort;
  currentPage: number;
};

export function getHomePageFilterParams({
  medium,
  sort,
  page,
}: HomePageDropdownConfigParams): HomePageDropdownConfigCurrentParams {
  const currentMedium = medium;
  const currentSort = sort;
  const currentPage = page;

  return { currentSort, currentMedium, currentPage };
}
