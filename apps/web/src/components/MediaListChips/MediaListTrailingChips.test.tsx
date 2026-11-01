import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  QueryParamsGetManyPartial,
  QueryParamsStatsRange,
  QueryParamsSubscribedPartialSort,
} from '@podverse/helpers-requests';

import { MediaListTrailingChips } from './MediaListTrailingChips';

type SortStubProps = {
  onChange: (sort: string, range: QueryParamsStatsRange | null) => void;
  options: readonly { label: string; value: string }[];
};

type CategoriesStubProps = { onToggle: () => void };

vi.mock('../ListSortChip/ListSortChip', () => ({
  ListSortChip: ({ onChange, options }: SortStubProps) => (
    <div data-testid="sort-stub">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value, option.value === 'top' ? 'month' : null)}
        >
          {option.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../ViewSelector/ViewSelector', () => ({
  ViewSelector: () => <span data-testid="view-selector-stub" />,
}));

vi.mock('../Category/CategoriesChip', () => ({
  CategoriesChip: ({ onToggle }: CategoriesStubProps) => (
    <button data-testid="categories-stub" type="button" onClick={onToggle}>
      Categories
    </button>
  ),
}));

vi.mock('../../hooks/useListViewMode', () => ({
  useListViewMode: () => ({ viewSelected: 'grid', setViewSelected: vi.fn() }),
}));

const SORT_OPTIONS: { label: string; value: QueryParamsSubscribedPartialSort }[] = [
  { label: 'Recent', value: 'recent' },
  { label: 'Top', value: 'top' },
];

const CATEGORY_TOP_WEEK: QueryParamsGetManyPartial = {
  category: 'arts',
  medium: 'av',
  page: 3,
  range: 'week',
  sort: 'top',
  type: 'category',
};

const GLOBAL_RECENT: QueryParamsGetManyPartial = {
  category: null,
  medium: 'av',
  page: 2,
  range: null,
  sort: 'recent',
  type: 'global',
};

afterEach(() => {
  cleanup();
});

describe('MediaListTrailingChips', () => {
  it('choosing Recent keeps every other filter field, resets the page, and clears the range', () => {
    const setFilterParams = vi.fn<(next: QueryParamsGetManyPartial) => void>();

    render(
      <MediaListTrailingChips
        filterParams={CATEGORY_TOP_WEEK}
        setFilterParams={setFilterParams}
        showViewSelector
        sortOptions={SORT_OPTIONS}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Recent' }));

    expect(setFilterParams).toHaveBeenCalledWith({
      category: 'arts',
      medium: 'av',
      page: 1,
      range: null,
      sort: 'recent',
      type: 'category',
    });
  });

  it('choosing Top passes the range the sort chip returned', () => {
    const setFilterParams = vi.fn<(next: QueryParamsGetManyPartial) => void>();

    render(
      <MediaListTrailingChips
        filterParams={GLOBAL_RECENT}
        setFilterParams={setFilterParams}
        showViewSelector
        sortOptions={SORT_OPTIONS}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Top' }));

    expect(setFilterParams).toHaveBeenCalledWith({
      ...GLOBAL_RECENT,
      page: 1,
      range: 'month',
      sort: 'top',
    });
  });

  it('renders Categories, then Sort, then the gear while the category list is closed', () => {
    const { container } = render(
      <MediaListTrailingChips
        category={{ value: null, isListOpen: false, onClear: vi.fn(), setIsListOpen: vi.fn() }}
        filterParams={GLOBAL_RECENT}
        setFilterParams={vi.fn()}
        showViewSelector
        sortOptions={SORT_OPTIONS}
      />
    );

    const testIds = Array.from(container.querySelectorAll('[data-testid]')).map((element) =>
      element.getAttribute('data-testid')
    );
    expect(testIds).toEqual(['categories-stub', 'sort-stub', 'view-selector-stub']);
  });

  it('shows only Categories while the category list is open, and pressing it closes the list', () => {
    const onClear = vi.fn();
    const setIsListOpen = vi.fn<(open: boolean) => void>();

    render(
      <MediaListTrailingChips
        category={{ value: 'arts', isListOpen: true, onClear, setIsListOpen }}
        filterParams={CATEGORY_TOP_WEEK}
        setFilterParams={vi.fn()}
        showViewSelector
        sortOptions={SORT_OPTIONS}
      />
    );

    expect(screen.getByTestId('categories-stub')).toBeTruthy();
    expect(screen.queryByTestId('sort-stub')).toBeNull();
    expect(screen.queryByTestId('view-selector-stub')).toBeNull();

    fireEvent.click(screen.getByTestId('categories-stub'));
    expect(setIsListOpen).toHaveBeenCalledWith(false);
    expect(onClear).not.toHaveBeenCalled();
  });

  it('pressing a chosen category clears it instead of opening the list', () => {
    const onClear = vi.fn();
    const setIsListOpen = vi.fn<(open: boolean) => void>();

    render(
      <MediaListTrailingChips
        category={{ value: 'arts', isListOpen: false, onClear, setIsListOpen }}
        filterParams={CATEGORY_TOP_WEEK}
        setFilterParams={vi.fn()}
        showViewSelector
        sortOptions={SORT_OPTIONS}
      />
    );

    fireEvent.click(screen.getByTestId('categories-stub'));
    expect(onClear).toHaveBeenCalledOnce();
    expect(setIsListOpen).not.toHaveBeenCalled();
  });

  it('pressing Categories with nothing chosen opens the list', () => {
    const setIsListOpen = vi.fn<(open: boolean) => void>();

    render(
      <MediaListTrailingChips
        category={{ value: null, isListOpen: false, onClear: vi.fn(), setIsListOpen }}
        filterParams={GLOBAL_RECENT}
        setFilterParams={vi.fn()}
        showViewSelector
        sortOptions={SORT_OPTIONS}
      />
    );

    fireEvent.click(screen.getByTestId('categories-stub'));
    expect(setIsListOpen).toHaveBeenCalledWith(true);
  });

  it('leaves the gear out when the list has one layout', () => {
    render(
      <MediaListTrailingChips
        filterParams={GLOBAL_RECENT}
        setFilterParams={vi.fn()}
        showViewSelector={false}
        sortOptions={SORT_OPTIONS}
      />
    );

    expect(screen.getByTestId('sort-stub')).toBeTruthy();
    expect(screen.queryByTestId('view-selector-stub')).toBeNull();
  });
});
