'use client';

import type { ReactNode } from 'react';
import { useCallback } from 'react';

import { mergeSortPrefsInBrowserCookie } from '../../../lib/cookies/browserCookies';
import type { SortDirection } from '../../../lib/cookies/sortPrefsCookie';
import { Table } from '../Table/Table';

export type TableWithSortColumn = {
  key: string;
  align?: 'center' | 'left' | 'right';
  defaultSortOrder?: SortDirection;
  header: ReactNode;
  /** When `sortable`, used for the sort control `aria-label` if set; otherwise derived from string `header`. */
  sortAriaLabel?: string;
  sortKey?: string;
  sortable?: boolean;
};

export type TableWithSortProps = {
  children: ReactNode;
  className?: string;
  columns: TableWithSortColumn[];
  onSortChange: (sortKey: string, nextOrder: SortDirection) => void;
  sortBy: string | undefined;
  sortOrder: SortDirection;
  /** When set with `sortPrefsListKey`, persists sort to the browser cookie on header click. */
  sortPrefsCookieName?: string;
  /** List key scoped inside the sort-preferences cookie. */
  sortPrefsListKey?: string;
};

function resolveSortAriaLabel(col: TableWithSortColumn): string {
  if (col.sortAriaLabel !== undefined && col.sortAriaLabel !== '') {
    return col.sortAriaLabel;
  }
  if (typeof col.header === 'string') {
    return `Sort by ${col.header}`;
  }
  return 'Sort column';
}

export function TableWithSort({
  children,
  className,
  columns,
  onSortChange,
  sortBy,
  sortOrder,
  sortPrefsCookieName,
  sortPrefsListKey,
}: TableWithSortProps) {
  const handleSort = useCallback(
    (col: TableWithSortColumn) => {
      const sortKey = col.sortKey ?? col.key;
      const defaultOrder = col.defaultSortOrder ?? 'asc';
      const active = sortBy === sortKey;
      const nextOrder: SortDirection = active
        ? sortOrder === 'asc'
          ? 'desc'
          : 'asc'
        : defaultOrder;

      if (
        sortPrefsCookieName !== undefined &&
        sortPrefsListKey !== undefined &&
        sortPrefsCookieName.trim() !== '' &&
        sortPrefsListKey.trim() !== ''
      ) {
        mergeSortPrefsInBrowserCookie(sortPrefsCookieName, sortPrefsListKey, {
          sortBy: sortKey,
          sortOrder: nextOrder,
        });
      }
      onSortChange(sortKey, nextOrder);
    },
    [onSortChange, sortBy, sortOrder, sortPrefsCookieName, sortPrefsListKey]
  );

  return (
    <Table className={className}>
      <Table.Head>
        <Table.Row>
          {columns.map((col) => {
            const sortKey = col.sortKey ?? col.key;
            const sortable = col.sortable !== false;
            if (!sortable) {
              return <Table.HeaderCell key={col.key}>{col.header}</Table.HeaderCell>;
            }
            const active = sortBy === sortKey;
            return (
              <Table.SortableHeaderCell
                key={col.key}
                ariaLabel={resolveSortAriaLabel(col)}
                sortActive={active}
                sortDirection={active ? sortOrder : null}
                onSort={() => {
                  handleSort(col);
                }}
              >
                {col.header}
              </Table.SortableHeaderCell>
            );
          })}
        </Table.Row>
      </Table.Head>
      {children}
    </Table>
  );
}
