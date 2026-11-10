import { describe, expect, it } from 'vitest';

import { epochMsFromRowUpdatedAt, itemRowShowsUnseenDot } from './itemUnseen';

const threshold = Date.parse('2026-08-20T00:00:00.000Z');

describe('epochMsFromRowUpdatedAt', () => {
  it('reads a number below 1e12 as seconds', () => {
    expect(epochMsFromRowUpdatedAt(1_700_000_000)).toBe(1_700_000_000_000);
  });

  it('reads a number at or above 1e12 as milliseconds', () => {
    expect(epochMsFromRowUpdatedAt(1e12)).toBe(1e12);
    expect(epochMsFromRowUpdatedAt(1_700_000_000_000)).toBe(1_700_000_000_000);
  });

  it('reads empty, null, undefined, and unparseable values as null', () => {
    expect(epochMsFromRowUpdatedAt('')).toBeNull();
    expect(epochMsFromRowUpdatedAt(null)).toBeNull();
    expect(epochMsFromRowUpdatedAt(undefined)).toBeNull();
    expect(epochMsFromRowUpdatedAt('not a date')).toBeNull();
  });
});

describe('itemRowShowsUnseenDot', () => {
  it('shows the dot when an ISO string is after the threshold', () => {
    expect(itemRowShowsUnseenDot(false, '2026-08-21T00:00:00.000Z', threshold)).toBe(true);
  });

  it('does not show the dot when an ISO string equals the threshold', () => {
    expect(itemRowShowsUnseenDot(false, '2026-08-20T00:00:00.000Z', threshold)).toBe(false);
  });

  it('reads a number below 1e12 as seconds', () => {
    expect(itemRowShowsUnseenDot(false, 1_700_000_000, 1_700_000_000_000)).toBe(false);
    expect(itemRowShowsUnseenDot(false, 1_700_000_060, 1_700_000_000_000)).toBe(true);
  });

  it('reads a number at or above 1e12 as milliseconds', () => {
    expect(itemRowShowsUnseenDot(false, 1_700_000_000_001, 1_700_000_000_000)).toBe(true);
    expect(itemRowShowsUnseenDot(false, 1_700_000_000_000, 1_700_000_000_000)).toBe(false);
    expect(itemRowShowsUnseenDot(false, 1e12, 1e12 - 1)).toBe(true);
  });

  it('does not show the dot for null updatedAt, null last seen, or undefined last seen', () => {
    expect(itemRowShowsUnseenDot(false, null, threshold)).toBe(false);
    expect(itemRowShowsUnseenDot(false, '2026-08-21T00:00:00.000Z', null)).toBe(false);
    expect(itemRowShowsUnseenDot(false, '2026-08-21T00:00:00.000Z', undefined)).toBe(false);
  });

  it('does not show the dot on a channel list even when the date is after the threshold', () => {
    expect(itemRowShowsUnseenDot(true, '2026-08-21T00:00:00.000Z', threshold)).toBe(false);
  });

  it('hides the dot when the item was engaged during the visit', () => {
    expect(
      itemRowShowsUnseenDot(
        false,
        '2026-08-21T00:00:00.000Z',
        threshold,
        'ep-1',
        new Set(['ep-1'])
      )
    ).toBe(false);
  });

  it('keeps a sibling row dotted when a different item was engaged', () => {
    expect(
      itemRowShowsUnseenDot(
        false,
        '2026-08-21T00:00:00.000Z',
        threshold,
        'ep-2',
        new Set(['ep-1'])
      )
    ).toBe(true);
  });
});
