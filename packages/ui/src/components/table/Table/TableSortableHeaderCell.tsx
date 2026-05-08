'use client';

import classNames from 'classnames';
import type { ReactNode } from 'react';
import { FaSort, FaSortDown, FaSortUp } from 'react-icons/fa';

import styles from './TableSortableHeaderCell.module.scss';

export type TableSortableHeaderSortDirection = 'asc' | 'desc' | null;

export type TableSortableHeaderCellProps = {
  /** Accessible name for the sort control (localized by the app). */
  ariaLabel: string;
  children: ReactNode;
  /** When false, column is not actively sorted (neutral icon). */
  sortActive: boolean;
  /** Active direction when `sortActive` is true. */
  sortDirection: TableSortableHeaderSortDirection;
  onSort: () => void;
  className?: string;
};

export function TableSortableHeaderCell({
  ariaLabel,
  children,
  sortActive,
  sortDirection,
  onSort,
  className,
}: TableSortableHeaderCellProps) {
  const ariaSort: 'ascending' | 'descending' | 'none' =
    sortActive && sortDirection !== null
      ? sortDirection === 'asc'
        ? 'ascending'
        : 'descending'
      : 'none';

  const Icon =
    !sortActive || sortDirection === null
      ? FaSort
      : sortDirection === 'asc'
        ? FaSortUp
        : FaSortDown;

  return (
    <th aria-sort={ariaSort} className={classNames(styles.th, className)} scope="col">
      <button aria-label={ariaLabel} className={styles.sortButton} onClick={onSort} type="button">
        <span className={styles.label}>{children}</span>
        <Icon aria-hidden className={styles.icon} />
      </button>
    </th>
  );
}
