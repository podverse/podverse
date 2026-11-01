import { describe, expect, it } from 'vitest';

import type { PaginationSettleSnapshot } from './settledTotalPages';
import { paginationQueryKey, settlePaginationTotalPages } from './settledTotalPages';

const episodes = { type: 'episodes', sort: 'recent', page: 3 };
const clips = { type: 'clips', sort: 'recent', page: 1 };

describe('paginationQueryKey', () => {
  it('ignores the page number and keeps every other filter', () => {
    expect(paginationQueryKey({ ...episodes, page: 1 })).toBe(paginationQueryKey(episodes));
    expect(paginationQueryKey(episodes)).not.toBe(paginationQueryKey(clips));
    expect(paginationQueryKey({ sort: 'recent', type: 'episodes' })).toBe(
      paginationQueryKey({ type: 'episodes', sort: 'recent' })
    );
  });
});

describe('settlePaginationTotalPages', () => {
  const settledEpisodes: PaginationSettleSnapshot = {
    key: paginationQueryKey(episodes),
    serial: 2,
  };

  it('shows the committed page count for the current filters', () => {
    const settled = settlePaginationTotalPages(settledEpisodes, paginationQueryKey(episodes), 2, 8);
    expect(settled.totalPages).toBe(8);
  });

  it('hides the controls as soon as a chip changes the filters, before the next page count', () => {
    const settled = settlePaginationTotalPages(settledEpisodes, paginationQueryKey(clips), 2, 8);
    expect(settled.totalPages).toBe(1);
    expect(settled.snapshot).toEqual(settledEpisodes);
  });

  it('shows the controls again when that query commits a page count, even if the count matches', () => {
    const hidden = settlePaginationTotalPages(settledEpisodes, paginationQueryKey(clips), 2, 8);
    const committed = settlePaginationTotalPages(hidden.snapshot, paginationQueryKey(clips), 3, 8);
    expect(committed.totalPages).toBe(8);
    expect(committed.snapshot.key).toBe(paginationQueryKey(clips));
  });

  it('keeps the controls up when only the page number changes', () => {
    const settled = settlePaginationTotalPages(
      settledEpisodes,
      paginationQueryKey({ ...episodes, page: 4 }),
      2,
      8
    );
    expect(settled.totalPages).toBe(8);
  });
});
