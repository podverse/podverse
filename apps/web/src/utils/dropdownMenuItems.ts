import type { QueryParamsStatsRange } from '@podverse/helpers-requests';
import { getValidQueryParam } from '@podverse/helpers-requests';
import type { DropdownOption } from '@podverse/ui';

export function getRangeDropdownItems(tFilters: (key: string) => string) {
  return [
    { label: tFilters('range.day'), param: 'range', value: 'day' },
    { label: tFilters('range.week'), param: 'range', value: 'week' },
    { label: tFilters('range.month'), param: 'range', value: 'month' },
    { label: tFilters('range.all_time'), param: 'range', value: 'all-time' },
  ];
}

function toTypeMenuItems<TType extends string>(
  typeOptions: readonly { label: string; value: TType }[]
): DropdownOption[] {
  return typeOptions.map((item) => ({
    label: item.label,
    param: 'type',
    value: item.value,
  }));
}

function toSortMenuItems<TSort extends string>(
  sortOptions: readonly { label: string; value: TSort }[]
): DropdownOption[] {
  return sortOptions.map((item) => ({
    label: item.label,
    param: 'sort',
    value: item.value,
  }));
}

export type SubscribedListDropdownSortOption<TSort extends string> = {
  label: string;
  value: TSort;
};

export type SubscribedListDropdownTypeOption<TType extends string> = {
  label: string;
  value: TType;
};

export function buildSubscribedListDropdownConfig<
  TType extends string,
  TSort extends string,
>(args: {
  categorySorts?: readonly SubscribedListDropdownSortOption<TSort>[];
  globalSorts: readonly SubscribedListDropdownSortOption<TSort>[];
  showRangeWhenSort: TSort;
  sort: TSort;
  subscribedSorts: readonly SubscribedListDropdownSortOption<TSort>[];
  tFilters: (key: string) => string;
  type: TType;
  typeOptions: readonly SubscribedListDropdownTypeOption<TType>[];
}): {
  rangeMenuItems: DropdownOption[];
  showRangeDropdown: boolean;
  sortMenuItems: DropdownOption[];
  typeMenuItems: DropdownOption[];
} {
  const {
    categorySorts,
    globalSorts,
    showRangeWhenSort,
    sort,
    subscribedSorts,
    tFilters,
    type,
    typeOptions,
  } = args;

  const rangeMenuItems = getRangeDropdownItems(tFilters);
  const typeStr = String(type);

  let sortMenuItems: DropdownOption[];
  if (typeStr === 'global') {
    sortMenuItems = toSortMenuItems(globalSorts);
  } else if (typeStr === 'subscribed') {
    sortMenuItems = toSortMenuItems(subscribedSorts);
  } else if (categorySorts !== undefined && typeStr === 'category') {
    sortMenuItems = toSortMenuItems(categorySorts);
  } else {
    sortMenuItems = [];
  }

  const showRangeDropdown = sort === showRangeWhenSort;

  return {
    rangeMenuItems,
    showRangeDropdown,
    sortMenuItems,
    typeMenuItems: toTypeMenuItems(typeOptions),
  };
}

type BuildSubscribedListFilterParamsBase<TType extends string, TSort extends string> = {
  defaultGlobalSort: TSort;
  defaultSubscribedSort: TSort;
  globalSortValues: readonly TSort[];
  isValidAuthSession: boolean;
  page: number;
  range: QueryParamsStatsRange | null;
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
    sort,
    subscribedSortValues,
    type,
  } = args;

  let currentType: TType;
  let currentSort = sort;
  let currentRange = range;
  let currentPage = page;

  if (args.supportsCategory) {
    const { category } = args;
    if (category) {
      currentType = 'category' as TType;
      currentSort = getValidQueryParam(globalSortValues, currentSort, defaultGlobalSort);
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
