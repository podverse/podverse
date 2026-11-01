'use client';

import { categoryChipPressAction } from '@podverse/helpers';
import type { SortPrefScope } from '@podverse/helpers';
import type { QueryParamsStatsRange } from '@podverse/helpers-requests';

import { useListViewMode } from '../../hooks/useListViewMode';
import { CategoriesChip } from '../Category/CategoriesChip';
import { ListSortChip } from '../ListSortChip/ListSortChip';
import { ViewSelector } from '../ViewSelector/ViewSelector';

export type MediaListSortFilter<TSort extends string> = {
  page: number;
  sort: TSort;
  range: QueryParamsStatsRange | null;
};

type MediaListTrailingChipsProps<
  TSort extends string,
  TFilter extends MediaListSortFilter<TSort>,
> = {
  filterParams: TFilter;
  setFilterParams: (next: TFilter) => void;
  /** Already-localized, in menu order. */
  sortOptions: readonly { label: string; value: TSort }[];
  /** Browse Podcasts, Episodes, and Clips. Sort and the gear unmount while the list is open. */
  category?: {
    value: string | null;
    isListOpen: boolean;
    setIsListOpen: (open: boolean) => void;
    /** Drops the chosen category and returns the list to the unfiltered directory. */
    onClear: () => void;
  };
  /** Lists that render one layout leave the gear out. */
  showViewSelector: boolean;
  /** List vs grid remembered for this list only. Omitted lists use the app-wide setting. */
  viewModeScope?: SortPrefScope;
};

/** Categories, then Sort, then the gear, for the end of a media chip row. */
export function MediaListTrailingChips<
  TSort extends string,
  TFilter extends MediaListSortFilter<TSort>,
>({
  filterParams,
  setFilterParams,
  sortOptions,
  category,
  showViewSelector,
  viewModeScope,
}: MediaListTrailingChipsProps<TSort, TFilter>) {
  const { viewSelected, setViewSelected } = useListViewMode(viewModeScope ?? null);
  const rangeSort = sortOptions.find((option) => option.value === 'top')?.value;
  const isCategoryListOpen = category?.isListOpen === true;

  return (
    <>
      {category ? (
        <CategoriesChip
          category={category.value}
          isListOpen={category.isListOpen}
          onToggle={() => {
            const action = categoryChipPressAction({
              category: category.value,
              isListOpen: category.isListOpen,
            });
            if (action === 'clear') {
              category.onClear();
              return;
            }
            category.setIsListOpen(action === 'open');
          }}
        />
      ) : null}
      {isCategoryListOpen ? null : (
        <ListSortChip
          onChange={(sort, range) => setFilterParams({ ...filterParams, page: 1, sort, range })}
          options={sortOptions}
          range={filterParams.sort === rangeSort ? filterParams.range : null}
          rangeSort={rangeSort}
          testId="media-list-sort"
          value={filterParams.sort}
        />
      )}
      {showViewSelector && !isCategoryListOpen ? (
        <ViewSelector setViewSelected={setViewSelected} viewSelected={viewSelected} />
      ) : null}
    </>
  );
}
