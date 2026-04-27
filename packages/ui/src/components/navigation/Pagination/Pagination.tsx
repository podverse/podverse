'use client';

import styles from './Pagination.module.scss';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <div className={styles.root}>
      <button
        className={styles.pageButton}
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        &laquo; Prev
      </button>

      {pages.map((p, i) =>
        p === null ? (
          <span key={`ellipsis-${i}`} className={styles.pageButton as string}>
            ...
          </span>
        ) : (
          <button
            key={p}
            className={`${styles.pageButton}${p === currentPage ? ` ${styles.activePage}` : ''}`}
            disabled={p === currentPage}
            onClick={() => onPageChange(p as number)}
            type="button"
          >
            {p}
          </button>
        )
      )}

      <button
        className={styles.pageButton}
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        Next &raquo;
      </button>

      <span className={styles.pageInfo}>
        Page {currentPage} of {totalPages}
      </span>
    </div>
  );
}

function getPageNumbers(current: number, total: number): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | null)[] = [1];

  if (current > 3) {
    pages.push(null);
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push(null);
  }

  pages.push(total);

  return pages;
}

export type { PaginationProps };
