'use client';

import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';

import type { QueryParamsMedium } from '@podverse/helpers';
import type { QueryParamsStatsRange, QueryParamsSubscribedType } from '@podverse/helpers-requests';
import { QUERY_PARAMS_STATS_RANGE_VALUES } from '@podverse/helpers-requests';
import type { DropdownOption } from '@podverse/ui';
import { Dropdown } from '@podverse/ui';

import { ViewSelector } from '../components/ViewSelector/ViewSelector';
import { useLocalSettings } from '../contexts/LocalSettings';

/** Fields every subscribed list filter update touches via this hook. */
type SubscribedListFilterCore = {
  page: number;
  medium: QueryParamsMedium;
  type: QueryParamsSubscribedType;
  sort: string;
  range: QueryParamsStatsRange | null;
  category: string | null;
};

/** Preserved keys (e.g. `liveItemType`) plus core query fields; shapes differ per list page. */
function mergeSubscribedListFilter<TFilter extends SubscribedListFilterCore>(
  preserved: Partial<TFilter>,
  core: SubscribedListFilterCore
): TFilter {
  // Structural merge for distinct `TFilter` extensions (livestreams, channels, etc.).
  return { ...preserved, ...core } as TFilter;
}

export type UseSubscribedListHeaderArgs<
  TSort extends string,
  TFilter extends SubscribedListFilterCore,
> = {
  defaultGlobalSort: TSort;
  defaultSubscribedSort: TSort;
  filterParams: TFilter;
  medium: QueryParamsMedium;
  range: QueryParamsStatsRange | null;
  rangeMenuItems: DropdownOption[];
  setFilterParams: (next: TFilter) => void;
  setShowCategoriesModal?: (open: boolean) => void;
  showRangeDropdown: boolean;
  sort: TSort;
  sortMenuItems: DropdownOption[];
  sortValues: readonly TSort[];
  type: QueryParamsSubscribedType;
  typeMenuItems: DropdownOption[];
  typeValues: readonly QueryParamsSubscribedType[];
  /**
   * Merged into each `setFilterParams` payload (e.g. livestreams preserve `liveItemType`).
   */
  preserveAcrossUpdates?: (current: TFilter) => Partial<TFilter>;
};

export function useSubscribedListHeader<
  TSort extends string,
  TFilter extends SubscribedListFilterCore,
>(args: UseSubscribedListHeaderArgs<TSort, TFilter>): { buttonsNode: ReactNode } {
  const {
    defaultGlobalSort,
    defaultSubscribedSort,
    filterParams,
    medium,
    range,
    rangeMenuItems,
    setFilterParams,
    setShowCategoriesModal,
    showRangeDropdown,
    sort,
    sortMenuItems,
    sortValues,
    type,
    typeMenuItems,
    typeValues,
    preserveAcrossUpdates,
  } = args;

  const { viewSelected, setViewSelected } = useLocalSettings();

  function isSubscribedType(val: string): val is QueryParamsSubscribedType {
    return typeValues.includes(val as QueryParamsSubscribedType);
  }

  function isSubscribedSort(val: string): val is TSort {
    return sortValues.includes(val as TSort);
  }

  function isStatsRange(val: string): val is QueryParamsStatsRange {
    return QUERY_PARAMS_STATS_RANGE_VALUES.includes(val as QueryParamsStatsRange);
  }

  const handleTypeChange = useCallback(
    (value: string) => {
      if (!isSubscribedType(value)) {
        return;
      }
      const preserved = preserveAcrossUpdates?.(filterParams) ?? {};
      if (value === 'global') {
        setFilterParams(
          mergeSubscribedListFilter<TFilter>(preserved, {
            page: 1,
            medium,
            type: value,
            sort: defaultGlobalSort,
            range: null,
            category: null,
          })
        );
        return;
      }
      if (value === 'category') {
        setShowCategoriesModal?.(true);
        return;
      }
      if (value === 'subscribed') {
        setFilterParams(
          mergeSubscribedListFilter<TFilter>(preserved, {
            page: 1,
            medium,
            type: value,
            sort: defaultSubscribedSort,
            range: null,
            category: null,
          })
        );
      }
    },
    [
      defaultGlobalSort,
      defaultSubscribedSort,
      filterParams,
      medium,
      preserveAcrossUpdates,
      setFilterParams,
      setShowCategoriesModal,
    ]
  );

  const handleSortChange = useCallback(
    (value: string) => {
      if (!isSubscribedSort(value)) {
        return;
      }
      const preserved = preserveAcrossUpdates?.(filterParams) ?? {};
      if (value === 'top') {
        setFilterParams(
          mergeSubscribedListFilter<TFilter>(preserved, {
            page: 1,
            medium,
            type: filterParams.type,
            sort: value,
            range: 'week',
            category: filterParams.category,
          })
        );
        return;
      }
      setFilterParams(
        mergeSubscribedListFilter<TFilter>(preserved, {
          page: 1,
          medium,
          type: filterParams.type,
          sort: value,
          range: filterParams.range,
          category: filterParams.category,
        })
      );
    },
    [filterParams, medium, preserveAcrossUpdates, setFilterParams]
  );

  const handleRangeChange = useCallback(
    (value: string) => {
      if (!isStatsRange(value)) {
        return;
      }
      const preserved = preserveAcrossUpdates?.(filterParams) ?? {};
      setFilterParams(
        mergeSubscribedListFilter<TFilter>(preserved, {
          page: 1,
          medium,
          type: filterParams.type,
          sort: filterParams.sort,
          range: value,
          category: filterParams.category,
        })
      );
    },
    [filterParams, medium, preserveAcrossUpdates, setFilterParams]
  );

  const buttonsNode = useMemo(
    () => (
      <>
        <Dropdown key="type" value={type} menuItems={typeMenuItems} onChange={handleTypeChange} />
        <Dropdown key="sort" value={sort} menuItems={sortMenuItems} onChange={handleSortChange} />
        {showRangeDropdown && range ? (
          <Dropdown
            key="range"
            value={range}
            menuItems={rangeMenuItems}
            onChange={handleRangeChange}
          />
        ) : null}
        <ViewSelector viewSelected={viewSelected} setViewSelected={setViewSelected} />
      </>
    ),
    [
      handleRangeChange,
      handleSortChange,
      handleTypeChange,
      range,
      rangeMenuItems,
      setViewSelected,
      showRangeDropdown,
      sort,
      sortMenuItems,
      type,
      typeMenuItems,
      viewSelected,
    ]
  );

  return { buttonsNode };
}
