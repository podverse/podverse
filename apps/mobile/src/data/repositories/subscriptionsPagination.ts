export type DirectoryPageProgress = {
  itemCount: number;
  limit: number;
  requestedPage: number;
  responsePage: number;
  totalCount: number | null;
};

/**
 * Continue a complete directory subscription walk from one validated response.
 *
 * Responses with a known count use that count. Responses without one continue until a short page,
 * which avoids imposing a client-side subscription-count ceiling.
 */
export function getNextDirectoryPage(progress: DirectoryPageProgress): number | null {
  const {
    itemCount,
    limit,
    requestedPage,
    responsePage,
    totalCount,
  } = progress;

  if (
    !Number.isInteger(itemCount) ||
    itemCount < 0 ||
    !Number.isInteger(limit) ||
    limit <= 0 ||
    !Number.isInteger(requestedPage) ||
    requestedPage < 1 ||
    !Number.isInteger(responsePage) ||
    responsePage < 1 ||
    responsePage !== requestedPage ||
    (totalCount !== null && (!Number.isInteger(totalCount) || totalCount < 0))
  ) {
    throw new Error('Invalid directory subscription pagination metadata');
  }

  if (totalCount !== null) {
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    return responsePage < totalPages ? responsePage + 1 : null;
  }

  return itemCount < limit ? null : responsePage + 1;
}
