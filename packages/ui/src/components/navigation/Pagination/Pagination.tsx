'use client';

import { useState } from 'react';

import { GoToPageModal } from '../GoToPageModal/GoToPageModal';

import styles from './Pagination.module.scss';

type PaginationGoToPageLabels = {
  buttonLabel: string;
  cancelLabel: string;
  closeButtonAriaLabel: string;
  invalidPageMessage: string;
  modalAriaLabel: string;
  modalTitle: string;
  pageInputLabel: string;
  submitLabel: string;
};

type PaginationProps = {
  currentPage: number;
  /** Optional labels for the “go to page” modal; when set, a control is shown next to pagination. */
  goToPage?: PaginationGoToPageLabels;
  /** Localized label for the next-page control (include » or words as needed). */
  nextLabel: string;
  onPageChange: (page: number) => void;
  /**
   * Localized page summary, e.g. from `t('paginationPageOf', { currentPage, totalPages })`
   * in the app.
   */
  pageIndicatorLabel: string;
  /** Localized label for the previous-page control (include « or words as needed). */
  prevLabel: string;
  /**
   * When set (cookie / client-driven lists), invoked instead of `onPageChange` so routing can be skipped.
   */
  refreshOnPage?: (page: number) => void;
  totalPages: number;
};

function applyPageChange(
  page: number,
  onPageChange: (page: number) => void,
  refreshOnPage: ((page: number) => void) | undefined
) {
  if (refreshOnPage !== undefined) {
    refreshOnPage(page);
    return;
  }
  onPageChange(page);
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  nextLabel,
  pageIndicatorLabel,
  prevLabel,
  refreshOnPage,
  goToPage,
}: PaginationProps) {
  const [goToPageOpen, setGoToPageOpen] = useState(false);

  if (totalPages <= 1) {
    return null;
  }

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <>
      <div className={styles.root}>
        <button
          className={styles.pageButton}
          disabled={currentPage <= 1}
          onClick={() => {
            applyPageChange(currentPage - 1, onPageChange, refreshOnPage);
          }}
          type="button"
        >
          {prevLabel}
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
              onClick={() => {
                applyPageChange(p, onPageChange, refreshOnPage);
              }}
              type="button"
            >
              {p}
            </button>
          )
        )}

        <button
          className={styles.pageButton}
          disabled={currentPage >= totalPages}
          onClick={() => {
            applyPageChange(currentPage + 1, onPageChange, refreshOnPage);
          }}
          type="button"
        >
          {nextLabel}
        </button>

        {goToPage !== undefined ? (
          <button
            className={styles.pageButton}
            onClick={() => {
              setGoToPageOpen(true);
            }}
            type="button"
          >
            {goToPage.buttonLabel}
          </button>
        ) : null}

        <span className={styles.pageInfo}>{pageIndicatorLabel}</span>
      </div>

      {goToPage !== undefined ? (
        <GoToPageModal
          cancelLabel={goToPage.cancelLabel}
          closeButtonAriaLabel={goToPage.closeButtonAriaLabel}
          invalidPageMessage={goToPage.invalidPageMessage}
          isOpen={goToPageOpen}
          modalAriaLabel={goToPage.modalAriaLabel}
          onClose={() => {
            setGoToPageOpen(false);
          }}
          onSubmit={(page) => {
            applyPageChange(page, onPageChange, refreshOnPage);
          }}
          pageInputLabel={goToPage.pageInputLabel}
          submitLabel={goToPage.submitLabel}
          title={goToPage.modalTitle}
          totalPages={totalPages}
        />
      ) : null}
    </>
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
