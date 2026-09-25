/**
 * Which fill a list body may show for the current selection.
 *
 * Empty copy is only allowed when the load for that selection has settled, there is no error, and
 * the row count is actually zero. Until then the body is loading — never a flash of "nothing found".
 */
export type ListFillKind = 'loading' | 'error' | 'empty' | 'ready';

export type ResolveListFillInput = {
  /** Settled load for the current chip / tab / query / entity. */
  isSettled: boolean;
  errorKey: string | null;
  rowCount: number;
};

export function resolveListFill({
  isSettled,
  errorKey,
  rowCount,
}: ResolveListFillInput): ListFillKind {
  if (!isSettled) {
    return 'loading';
  }
  if (errorKey !== null && rowCount === 0) {
    return 'error';
  }
  if (rowCount === 0) {
    return 'empty';
  }
  return 'ready';
}
