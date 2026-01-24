export const PAGINATION = {
  MAX_COUNT: 1000,
  DEFAULT_LIMIT: 60,
};

export function getTotalPages(
  count: number | null,
  limit: number,
  currentPageItemCount: number,
  currentPage: number,
): number {
  if (count === null) {
    if (currentPageItemCount < limit) {
      return currentPage;
    }
    return PAGINATION.MAX_COUNT;
  }

  if (!limit || limit <= 0) {return 1;}
  return Math.max(1, Math.ceil(count / limit)); // ensure at least 1
}

export function getUndeterminedTotalPages() {
  return 1000;
}
