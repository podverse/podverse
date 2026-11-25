export const PAGINATION = {
  MAX_COUNT: 1000,
  DEFAULT_LIMIT: 60,
  /** Page buttons the directory strip draws. The list probe reads this many pages, plus one row. */
  PAGE_BUTTONS: 5,
};

/**
 * Rows to load for one page of a list that has no stored total: {@link PAGINATION.PAGE_BUTTONS}
 * pages, plus one row on the page after that window.
 */
export function pageLookaheadTake(limit: number): number {
  if (limit <= 0) {
    return 0;
  }
  return limit * PAGINATION.PAGE_BUTTONS + 1;
}

export function getTotalPages(
  count: number | null,
  limit: number,
  currentPageItemCount: number,
  currentPage: number
): number {
  if (count === null) {
    // A short page is the last page. A full page offers one more page.
    if (currentPageItemCount < limit) {
      return currentPage;
    }
    return currentPage + 1;
  }

  if (!limit || limit <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(count / limit)); // ensure at least 1
}

/**
 * `rows` was loaded with {@link pageLookaheadTake}. The response keeps the first `limit` rows.
 * The count is every row read, including the ones past this page, so the strip can show each
 * page that read actually reached. A list longer than the probe reports that window, and the
 * next request extends it.
 */
export function resolvePageLookahead<T>(
  rows: readonly T[],
  limit: number,
  offset: number
): { rows: T[]; count: number } {
  const count = offset + rows.length;
  if (limit > 0 && rows.length > limit) {
    return { rows: rows.slice(0, limit), count };
  }
  return { rows: [...rows], count };
}

export function getUndeterminedTotalPages() {
  return 1000;
}
