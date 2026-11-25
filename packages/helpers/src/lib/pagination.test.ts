import { describe, expect, it } from 'vitest';

import {
  getTotalPages,
  pageLookaheadTake,
  PAGINATION,
  resolvePageLookahead,
} from './pagination.js';

describe('getTotalPages', () => {
  it('offers one more page when the count is unknown and the page is full', () => {
    expect(getTotalPages(null, 60, 60, 1)).toBe(2);
    expect(getTotalPages(null, 60, 60, 4)).toBe(5);
  });

  it('treats a short page with an unknown count as the last page', () => {
    expect(getTotalPages(null, 60, 59, 4)).toBe(4);
  });

  it('uses the known count, including an exact multiple of the limit', () => {
    expect(getTotalPages(61, 60, 1, 2)).toBe(2);
    expect(getTotalPages(60, 60, 60, 1)).toBe(1);
    expect(getTotalPages(120, 60, 60, 2)).toBe(2);
    expect(getTotalPages(0, 60, 0, 1)).toBe(1);
  });
});

describe('pageLookaheadTake', () => {
  it('reads one strip of pages plus a row on the page after that', () => {
    expect(pageLookaheadTake(60)).toBe(60 * PAGINATION.PAGE_BUTTONS + 1);
    expect(pageLookaheadTake(0)).toBe(0);
  });
});

describe('resolvePageLookahead', () => {
  it('counts a short page and a full last page as the end', () => {
    expect(resolvePageLookahead(['a'], 2, 0)).toEqual({ rows: ['a'], count: 1 });
    expect(resolvePageLookahead(['a', 'b'], 2, 0)).toEqual({ rows: ['a', 'b'], count: 2 });
    expect(resolvePageLookahead(['c', 'd'], 2, 2)).toEqual({ rows: ['c', 'd'], count: 4 });
  });

  it('keeps the page and counts the later rows the probe read', () => {
    expect(resolvePageLookahead(['a', 'b', 'c', 'd', 'e'], 2, 0)).toEqual({
      rows: ['a', 'b'],
      count: 5,
    });
    expect(getTotalPages(5, 2, 2, 1)).toBe(3);
  });

  it('stops the reported total at the probe when the list continues past it', () => {
    const take = pageLookaheadTake(2);
    const rows = Array.from({ length: take }, (_, index) => index);
    const lookahead = resolvePageLookahead(rows, 2, 0);

    expect(lookahead.rows).toEqual([0, 1]);
    expect(lookahead.count).toBe(take);
    expect(getTotalPages(lookahead.count, 2, lookahead.rows.length, 1)).toBe(
      PAGINATION.PAGE_BUTTONS + 1
    );
  });

  it('reports an exact full strip when the extra row is absent', () => {
    const rows = Array.from({ length: 2 * PAGINATION.PAGE_BUTTONS }, (_, index) => index);
    const lookahead = resolvePageLookahead(rows, 2, 0);

    expect(lookahead.rows).toEqual([0, 1]);
    expect(lookahead.count).toBe(rows.length);
    expect(getTotalPages(lookahead.count, 2, lookahead.rows.length, 1)).toBe(
      PAGINATION.PAGE_BUTTONS
    );
  });
});
