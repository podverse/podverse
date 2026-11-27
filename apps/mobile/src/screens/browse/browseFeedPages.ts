import { appendUniqueBy } from '../../lib/pagination/pagedList';
import type { BrowseFeedResult } from './browseFeedData';

/**
 * Append the next Browse page after the rows already shown. Each page is already in the server's
 * order, so the merged list keeps that order without a re-sort. An id on both pages keeps its
 * first position; the keys match the list keys `BrowseScreen` renders.
 *
 * A page of a different kind than the current list is ignored.
 */
export const appendBrowseFeedPage = (
  current: BrowseFeedResult,
  next: BrowseFeedResult
): BrowseFeedResult => {
  if (current.kind === 'media' && next.kind === 'media') {
    return { kind: 'media', rows: appendUniqueBy(current.rows, next.rows, (row) => row.id) };
  }
  if (current.kind === 'playlists' && next.kind === 'playlists') {
    return {
      kind: 'playlists',
      playlists: appendUniqueBy(current.playlists, next.playlists, (row) => row.id_text),
    };
  }
  if (current.kind === 'users' && next.kind === 'users') {
    return {
      accounts: appendUniqueBy(current.accounts, next.accounts, (row) => row.id_text),
      kind: 'users',
    };
  }
  if (current.kind === 'people' && next.kind === 'people') {
    return {
      kind: 'people',
      people: appendUniqueBy(current.people, next.people, (row) => row.id_text),
    };
  }
  return current;
};
