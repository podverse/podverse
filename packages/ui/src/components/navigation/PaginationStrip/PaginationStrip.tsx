'use client';

import classNames from 'classnames';

import { NavArrowButton } from '../NavArrowButton/NavArrowButton';

import styles from './PaginationStrip.module.scss';

export type PaginationStripProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maxButtons: number;
  prevAriaLabel: string;
  nextAriaLabel: string;
  paginationControlsClassName?: string;
};

function getPageRange(currentPage: number, totalPages: number, maxButtons: number): number[] {
  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const half = Math.floor(maxButtons / 2);
  let start: number;
  let end: number;

  if (currentPage <= half) {
    start = 1;
    end = maxButtons;
  } else if (currentPage > totalPages - half) {
    start = totalPages - maxButtons + 1;
    end = totalPages;
  } else {
    start = currentPage - half;
    end = currentPage + half;
  }

  start = Math.max(1, start);
  end = Math.min(totalPages, end);

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/** Numeric page strip + chevron arrows (web list UX baseline). */
export function PaginationStrip({
  currentPage,
  totalPages,
  onPageChange,
  maxButtons,
  nextAriaLabel,
  paginationControlsClassName = '',
  prevAriaLabel,
}: PaginationStripProps) {
  const pageNumbers = getPageRange(currentPage, totalPages, maxButtons);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={classNames(styles.paginationControls, paginationControlsClassName)}>
      {currentPage <= 1 ? (
        <span className={styles.arrowPlaceholder} />
      ) : (
        <NavArrowButton
          ariaLabel={prevAriaLabel}
          direction="left"
          onClick={() => onPageChange(currentPage - 1)}
        />
      )}
      {pageNumbers.map((i) => (
        <button
          key={i}
          className={classNames(styles.pageButton, i === currentPage ? styles.active : null)}
          disabled={i === currentPage}
          onClick={() => onPageChange(i)}
          type="button"
        >
          {i}
        </button>
      ))}
      {currentPage >= totalPages ? (
        <span className={styles.arrowPlaceholder} />
      ) : (
        <NavArrowButton
          ariaLabel={nextAriaLabel}
          direction="right"
          onClick={() => onPageChange(currentPage + 1)}
        />
      )}
    </div>
  );
}
