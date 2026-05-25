'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';

import type { SortDirection } from '../../../lib/cookies/sortPrefsCookie';
import { Checkbox } from '../../form/Checkbox/Checkbox';
import { Pagination } from '../../navigation/Pagination/Pagination';
import { Table } from '../Table/Table';
import {
  computeFilterBarColumns,
  tableWithFilterColumnsToSortColumns,
} from '../Table/tableWithFilterColumnHelpers';
import { TableFilterBar } from '../TableFilterBar/TableFilterBar';
import type { TableWithSortColumn } from '../TableWithSort/TableWithSort';
import { TableWithSort } from '../TableWithSort/TableWithSort';

import styles from './TableWithFilter.module.scss';

export type TableWithFilterColumn = {
  defaultSortOrder?: SortDirection;
  header: ReactNode;
  id: string;
  label: string;
  sortAriaLabel?: string;
  sortKey?: string;
  sortable?: boolean;
};

export type TableWithFilterPaginationLabels = {
  currentPage: number;
  goToPage?: {
    buttonLabel: string;
    cancelLabel: string;
    closeButtonAriaLabel: string;
    invalidPageMessage: string;
    modalAriaLabel: string;
    modalTitle: string;
    pageInputLabel: string;
    submitLabel: string;
  };
  nextLabel: string;
  onPageChange: (page: number) => void;
  pageIndicatorLabel: string;
  prevLabel: string;
  refreshOnPage?: (page: number) => void;
  totalPages: number;
};

export type TableWithFilterFilterBag = {
  handleColumnSelectionChange: (columnIds: string[]) => void;
  search: string;
  selectedColumnIds: string[];
  setSearch: (value: string) => void;
};

export type TableWithFilterBulkSelect<TRow> = {
  ariaLabels: { selectAll: string; selectRow: string };
  getRowKey: (row: TRow) => string;
  onSelectionChange: (keys: string[]) => void;
  selectedKeys: string[];
};

export type TableWithFilterBodyRenderArgs = {
  filterBag: TableWithFilterFilterBag;
  sortBy: string | undefined;
  sortOrder: SortDirection;
};

/** Empty table messaging: {@link mode} `'system-empty'` can hide filter/search/pagination when {@link hideTools} is not `false`. */
export type TableWithFilterEmptyState = {
  hideTools?: boolean;
  message: ReactNode;
  mode: 'filtered-empty' | 'system-empty';
};

type TableWithFilterSharedProps<TRow> = {
  bulkSelect?: TableWithFilterBulkSelect<TRow>;
  columns: TableWithFilterColumn[];
  emptyState?: TableWithFilterEmptyState;
  /** From {@link useTableFilterState} at the page or resource wrapper. */
  filter: TableWithFilterFilterBag;
  filterableColumnIds?: string[];
  labels: {
    filterColumnsLabel: string;
    funnelAriaLabel: string;
    searchPlaceholder: string;
  };
  onSortChange: (sortKey: string, order: SortDirection) => void;
  pagination?: TableWithFilterPaginationLabels;
  /** `'none'` hides numeric pagination (e.g. Workers). Default `'page'`. */
  paginationMode?: 'none' | 'page';
  sortBy: string | undefined;
  sortOrder: SortDirection;
  sortPrefsCookieName?: string;
  sortPrefsListKey?: string;
  sortableColumnIds?: string[];
  /**
   * When true, hides the filter bar, trailing toolbar, and pagination.
   * Use with {@link bodyRender} when the parent knows the dataset is system-empty.
   */
  suppressToolbar?: boolean;
  trailingToolbar?: ReactNode;
};

export type TableWithFilterProps<TRow> =
  | (TableWithFilterSharedProps<TRow> & {
      /** When set, replaces the default scroll + sort + row body. Filter row and pagination unchanged. */
      bodyRender: (args: TableWithFilterBodyRenderArgs) => ReactNode;
    })
  | (TableWithFilterSharedProps<TRow> & {
      bodyRender?: undefined;
      /** Highlights the row whose {@link getRowKey} matches (e.g. selected detail). */
      selectedRowKey?: string;
      /** Whole-row click (e.g. stats detail selection). */
      onRowClick?: (row: TRow, index: number) => void;
      /** Table body cells for one row (inside `<tr>`). */
      renderCells: (row: TRow, index: number) => ReactNode;
      rows: TRow[];
      getRowKey: (row: TRow) => string;
    });

export function TableWithFilter<TRow>(props: TableWithFilterProps<TRow>) {
  const {
    columns,
    emptyState,
    filter,
    filterableColumnIds,
    labels,
    onSortChange,
    pagination,
    paginationMode = 'page',
    sortBy,
    sortOrder,
    sortPrefsCookieName,
    sortPrefsListKey,
    sortableColumnIds,
    suppressToolbar,
    trailingToolbar,
  } = props;

  const resolvedEmptyMessage = emptyState?.message;

  const filterColumns = useMemo(
    () => computeFilterBarColumns(columns, filterableColumnIds),
    [columns, filterableColumnIds]
  );

  const showPagination =
    paginationMode === 'page' && pagination !== undefined && pagination.totalPages > 1;

  if (props.bodyRender !== undefined) {
    const { bodyRender } = props;
    const hideChrome = suppressToolbar === true;

    return (
      <div className={styles.root}>
        {!hideChrome ? (
          <div className={styles.filterRow}>
            <div className={styles.filterBar}>
              <TableFilterBar
                columns={filterColumns}
                filterColumnsLabel={labels.filterColumnsLabel}
                funnelAriaLabel={labels.funnelAriaLabel}
                onSearchChange={filter.setSearch}
                onSelectedColumnIdsChange={filter.handleColumnSelectionChange}
                searchPlaceholder={labels.searchPlaceholder}
                searchValue={filter.search}
                selectedColumnIds={filter.selectedColumnIds}
              />
            </div>
            {trailingToolbar !== undefined && trailingToolbar !== null ? (
              <div className={styles.trailing}>{trailingToolbar}</div>
            ) : null}
          </div>
        ) : null}

        {bodyRender({
          filterBag: filter,
          sortBy,
          sortOrder,
        })}

        {!hideChrome && showPagination && pagination !== undefined ? (
          <Pagination
            currentPage={pagination.currentPage}
            goToPage={pagination.goToPage}
            nextLabel={pagination.nextLabel}
            onPageChange={pagination.onPageChange}
            pageIndicatorLabel={pagination.pageIndicatorLabel}
            prevLabel={pagination.prevLabel}
            refreshOnPage={pagination.refreshOnPage}
            totalPages={pagination.totalPages}
          />
        ) : null}
      </div>
    );
  }

  const { bulkSelect, getRowKey, onRowClick, renderCells, rows, selectedRowKey } = props;

  const sortColumnsBase = useMemo(
    () => tableWithFilterColumnsToSortColumns(columns, sortableColumnIds),
    [columns, sortableColumnIds]
  );

  const sortColumns: TableWithSortColumn[] = useMemo(() => {
    const base = sortColumnsBase;
    if (bulkSelect !== undefined) {
      return [
        {
          header: (
            <Checkbox
              aria-label={bulkSelect.ariaLabels.selectAll}
              checked={
                rows.length > 0 &&
                rows.every((row) => bulkSelect.selectedKeys.includes(bulkSelect.getRowKey(row)))
              }
              onChange={(e) => {
                const checked = e.target.checked;
                const keysOnPage = rows.map((r) => bulkSelect.getRowKey(r));
                if (checked) {
                  const set = new Set([...bulkSelect.selectedKeys, ...keysOnPage]);
                  bulkSelect.onSelectionChange(Array.from(set));
                } else {
                  const drop = new Set(keysOnPage);
                  bulkSelect.onSelectionChange(bulkSelect.selectedKeys.filter((k) => !drop.has(k)));
                }
              }}
            />
          ),
          key: '__bulk_select',
          sortable: false,
        },
        ...base,
      ];
    }
    return base;
  }, [bulkSelect, rows, sortColumnsBase]);

  const isEmpty = rows.length === 0;

  const hideChromeForSystemEmpty =
    suppressToolbar === true ||
    (isEmpty &&
      emptyState !== undefined &&
      emptyState.mode === 'system-empty' &&
      emptyState.hideTools !== false);

  const showEmptyBlock =
    isEmpty && resolvedEmptyMessage !== undefined && resolvedEmptyMessage !== null;

  return (
    <div className={styles.root}>
      {!hideChromeForSystemEmpty ? (
        <div className={styles.filterRow}>
          <div className={styles.filterBar}>
            <TableFilterBar
              columns={filterColumns}
              filterColumnsLabel={labels.filterColumnsLabel}
              funnelAriaLabel={labels.funnelAriaLabel}
              onSearchChange={filter.setSearch}
              onSelectedColumnIdsChange={filter.handleColumnSelectionChange}
              searchPlaceholder={labels.searchPlaceholder}
              searchValue={filter.search}
              selectedColumnIds={filter.selectedColumnIds}
            />
          </div>
          {trailingToolbar !== undefined && trailingToolbar !== null ? (
            <div className={styles.trailing}>{trailingToolbar}</div>
          ) : null}
        </div>
      ) : null}

      {showEmptyBlock ? (
        <div className={styles.emptyState} role="status">
          <p className={styles.emptyMessage}>{resolvedEmptyMessage}</p>
        </div>
      ) : null}

      {!isEmpty ? (
        <Table.ScrollContainer>
          <TableWithSort
            columns={sortColumns}
            onSortChange={onSortChange}
            sortBy={sortBy}
            sortOrder={sortOrder}
            sortPrefsCookieName={sortPrefsCookieName}
            sortPrefsListKey={sortPrefsListKey}
          >
            <Table.Body>
              {rows.map((row, index) => (
                <Table.Row
                  key={getRowKey(row)}
                  selected={selectedRowKey !== undefined && getRowKey(row) === selectedRowKey}
                  onClick={
                    onRowClick !== undefined
                      ? () => {
                          onRowClick(row, index);
                        }
                      : undefined
                  }
                >
                  {bulkSelect !== undefined ? (
                    <Table.SelectCell>
                      <Checkbox
                        aria-label={bulkSelect.ariaLabels.selectRow}
                        checked={bulkSelect.selectedKeys.includes(bulkSelect.getRowKey(row))}
                        onChange={(e) => {
                          const key = bulkSelect.getRowKey(row);
                          const set = new Set(bulkSelect.selectedKeys);
                          if (e.target.checked) {
                            set.add(key);
                          } else {
                            set.delete(key);
                          }
                          bulkSelect.onSelectionChange(Array.from(set));
                        }}
                      />
                    </Table.SelectCell>
                  ) : null}
                  {renderCells(row, index)}
                </Table.Row>
              ))}
            </Table.Body>
          </TableWithSort>
        </Table.ScrollContainer>
      ) : null}

      {!hideChromeForSystemEmpty && showPagination && pagination !== undefined ? (
        <Pagination
          currentPage={pagination.currentPage}
          goToPage={pagination.goToPage}
          nextLabel={pagination.nextLabel}
          onPageChange={pagination.onPageChange}
          pageIndicatorLabel={pagination.pageIndicatorLabel}
          prevLabel={pagination.prevLabel}
          refreshOnPage={pagination.refreshOnPage}
          totalPages={pagination.totalPages}
        />
      ) : null}
    </div>
  );
}
