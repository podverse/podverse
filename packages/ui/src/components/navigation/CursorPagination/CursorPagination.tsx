'use client';

import styles from './CursorPagination.module.scss';

export type CursorPaginationProps = {
  /** Localized label for the previous-page control (include any « symbols if desired). */
  prevLabel: string;
  /** Localized label for the next-page control. */
  nextLabel: string;
  /** Localized page indicator, e.g. `t('paginationPage', { page })` from the app. */
  pageLabel: string;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void | Promise<void>;
  isLoading?: boolean;
};

export function CursorPagination({
  prevLabel,
  nextLabel,
  pageLabel,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  isLoading = false,
}: CursorPaginationProps) {
  if (!hasPrev && !hasNext) {
    return null;
  }

  return (
    <div className={styles.root}>
      <button
        className={styles.pageButton}
        disabled={!hasPrev || isLoading}
        onClick={onPrev}
        type="button"
      >
        {prevLabel}
      </button>

      <button
        className={styles.pageButton}
        disabled={!hasNext || isLoading}
        onClick={() => {
          void onNext();
        }}
        type="button"
      >
        {nextLabel}
      </button>

      <span className={styles.pageInfo}>{pageLabel}</span>
    </div>
  );
}
