import { getTotalPages } from '@podverse/helpers';

/**
 * Whether the endpoint holds another page past the one just read.
 *
 * `count` is absent from some list responses; `getTotalPages` answers that by reading a full page as
 * "there is probably more", so a short page ends the list and a full one offers to go further.
 */
export const sectionResponseHasMore = (
  meta: { count: number | null; limit: number; page: number },
  pageRowCount: number
): boolean => {
  return getTotalPages(meta.count, meta.limit, pageRowCount, meta.page) > meta.page;
};
