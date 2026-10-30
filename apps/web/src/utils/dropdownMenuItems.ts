import type { QueryParamsStatsRange } from '@podverse/helpers-requests';
import { getValidQueryParam, QUERY_PARAMS_STATS_RANGE_VALUES } from '@podverse/helpers-requests';

import type { MediaListScope } from './mediaListChips';

/** `filters` catalog key for each popularity range. */
export const STATS_RANGE_LABEL_KEYS = {
  day: 'range.day',
  week: 'range.week',
  month: 'range.month',
  'all-time': 'range.all_time',
} as const satisfies Record<QueryParamsStatsRange, string>;

export function getRangeDropdownItems(tFilters: (key: string) => string) {
  return QUERY_PARAMS_STATS_RANGE_VALUES.map((value) => ({
    label: tFilters(STATS_RANGE_LABEL_KEYS[value]),
    param: 'range',
    value,
  }));
}

/** Range a global or category list uses when it is sorted by Top and no range is set. */
export const DEFAULT_DIRECTORY_TOP_RANGE: QueryParamsStatsRange = 'week';

function directoryRange(
  sort: string | null,
  range: QueryParamsStatsRange | null
): QueryParamsStatsRange | null {
  return sort === 'top' && range === null ? DEFAULT_DIRECTORY_TOP_RANGE : range;
}

type BuildSubscribedListFilterParamsBase<TType extends string, TSort extends string> = {
  defaultGlobalSort: TSort;
  defaultSubscribedSort: TSort;
  globalSortValues: readonly TSort[];
  isValidAuthSession: boolean;
  page: number;
  range: QueryParamsStatsRange | null;
  /** Account list, directory list, or the session default when omitted. */
  scope?: MediaListScope;
  sort: TSort | null;
  subscribedSortValues: readonly TSort[];
  type: TType | null;
};

export type BuildSubscribedListFilterParamsWithCategory<
  TType extends string,
  TSort extends string,
  TCategory,
> = BuildSubscribedListFilterParamsBase<TType, TSort> & {
  category: TCategory | null;
  supportsCategory: true;
};

export type BuildSubscribedListFilterParamsWithoutCategory<
  TType extends string,
  TSort extends string,
> = BuildSubscribedListFilterParamsBase<TType, TSort> & {
  supportsCategory: false;
};

export function buildSubscribedListFilterParams<
  TType extends string,
  TSort extends string,
  TCategory,
>(
  args: BuildSubscribedListFilterParamsWithCategory<TType, TSort, TCategory>
): {
  currentCategory: TCategory | null;
  currentPage: number;
  currentRange: QueryParamsStatsRange | null;
  currentSort: TSort;
  currentType: TType;
};
export function buildSubscribedListFilterParams<TType extends string, TSort extends string>(
  args: BuildSubscribedListFilterParamsWithoutCategory<TType, TSort>
): {
  currentPage: number;
  currentRange: QueryParamsStatsRange | null;
  currentSort: TSort;
  currentType: TType;
};
export function buildSubscribedListFilterParams<
  TType extends string,
  TSort extends string,
  TCategory,
>(
  args:
    | BuildSubscribedListFilterParamsWithCategory<TType, TSort, TCategory>
    | BuildSubscribedListFilterParamsWithoutCategory<TType, TSort>
):
  | {
      currentCategory: TCategory | null;
      currentPage: number;
      currentRange: QueryParamsStatsRange | null;
      currentSort: TSort;
      currentType: TType;
    }
  | {
      currentPage: number;
      currentRange: QueryParamsStatsRange | null;
      currentSort: TSort;
      currentType: TType;
    } {
  const {
    defaultGlobalSort,
    defaultSubscribedSort,
    globalSortValues,
    isValidAuthSession,
    page,
    range,
    scope,
    sort,
    subscribedSortValues,
    type: requestedType,
  } = args;

  if (scope === 'subscribed') {
    const currentType = 'subscribed' as TType;
    const currentSort = getValidQueryParam(subscribedSortValues, sort, defaultSubscribedSort);
    if (args.supportsCategory) {
      return {
        currentCategory: null,
        currentPage: page,
        currentRange: range,
        currentSort,
        currentType,
      };
    }
    return { currentPage: page, currentRange: range, currentSort, currentType };
  }

  let type = requestedType;
  let currentSort = sort;
  let currentRange = range;
  if (scope === 'browse' && type === 'subscribed') {
    type = 'global' as TType;
    currentSort = defaultGlobalSort;
    currentRange = null;
  }

  let currentType: TType;
  let currentPage = page;

  if (args.supportsCategory) {
    const { category } = args;
    if (category) {
      currentType = 'category' as TType;
      currentSort = getValidQueryParam(globalSortValues, currentSort, defaultGlobalSort);
      currentRange = directoryRange(currentSort, currentRange);
      return {
        currentCategory: category,
        currentPage,
        currentRange,
        currentSort,
        currentType,
      };
    }
  }

  if (type === 'global') {
    currentType = type;
    currentSort = getValidQueryParam(globalSortValues, currentSort, defaultGlobalSort);
    currentRange = directoryRange(currentSort, currentRange);
    if (args.supportsCategory) {
      const { category: cat } = args;
      return {
        currentCategory: cat,
        currentPage,
        currentRange,
        currentSort,
        currentType,
      };
    }
    return { currentPage, currentRange, currentSort, currentType };
  }

  if (type === 'subscribed') {
    currentType = type;
    currentSort = getValidQueryParam(subscribedSortValues, currentSort, defaultSubscribedSort);
    if (args.supportsCategory) {
      const { category: cat } = args;
      return {
        currentCategory: cat,
        currentPage,
        currentRange,
        currentSort,
        currentType,
      };
    }
    return { currentPage, currentRange, currentSort, currentType };
  }

  if (isValidAuthSession) {
    currentType = 'subscribed' as TType;
    currentSort = getValidQueryParam(subscribedSortValues, currentSort, defaultSubscribedSort);
    currentRange = null;
    currentPage = 1;
    if (args.supportsCategory) {
      return {
        currentCategory: null,
        currentPage,
        currentRange,
        currentSort,
        currentType,
      };
    }
    return { currentPage, currentRange, currentSort, currentType };
  }

  currentType = 'global' as TType;
  currentSort = getValidQueryParam(globalSortValues, currentSort, defaultGlobalSort);
  currentRange = directoryRange(currentSort, null);
  currentPage = 1;
  if (args.supportsCategory) {
    return {
      currentCategory: null,
      currentPage,
      currentRange,
      currentSort,
      currentType,
    };
  }
  return { currentPage, currentRange, currentSort, currentType };
}
