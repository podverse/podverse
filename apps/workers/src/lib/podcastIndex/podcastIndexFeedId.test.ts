import { describe, expect, it } from 'vitest';

import { podcastIndexFeedId } from './podcastIndexFeedId.js';

describe('podcastIndexFeedId', () => {
  it('accepts a positive numeric id', () => {
    expect(podcastIndexFeedId({ id: 920666 })).toBe(920666);
  });

  it('accepts a numeric string id', () => {
    expect(podcastIndexFeedId({ id: '6524027' })).toBe(6524027);
  });

  it('rejects missing, zero, and non-numeric ids', () => {
    expect(podcastIndexFeedId(null)).toBe(null);
    expect(podcastIndexFeedId({})).toBe(null);
    expect(podcastIndexFeedId({ id: 0 })).toBe(null);
    expect(podcastIndexFeedId({ id: 'album' })).toBe(null);
  });
});
