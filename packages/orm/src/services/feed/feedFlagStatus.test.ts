import { describe, expect, it, vi } from 'vitest';

vi.mock('@orm/db/index.js', () => ({
  AppDataSourceRead: {
    getRepository: () => ({
      findOne: vi.fn(),
    }),
  },
}));

vi.mock('@orm/entities/feed/feedFlagStatus.js', () => ({
  FeedFlagStatus: class FeedFlagStatus {},
  FeedFlagStatusStatusEnum: {
    Active: 1,
    AlwaysParse: 2,
    Spam: 3,
    PendingArchive: 4,
    Archived: 5,
    Takedown: 6,
  },
}));

import { checkIfFeedFlagStatusShouldParse, checkIfSpamFeed } from './feedFlagStatus.js';

describe('checkIfFeedFlagStatusShouldParse', () => {
  it('allows Active and AlwaysParse statuses', () => {
    expect(checkIfFeedFlagStatusShouldParse(1)).toBe(true);
    expect(checkIfFeedFlagStatusShouldParse(2)).toBe(true);
  });

  it('blocks non-allowed statuses', () => {
    expect(checkIfFeedFlagStatusShouldParse(3)).toBe(false);
    expect(checkIfFeedFlagStatusShouldParse(4)).toBe(false);
    expect(checkIfFeedFlagStatusShouldParse(5)).toBe(false);
    expect(checkIfFeedFlagStatusShouldParse(6)).toBe(false);
  });
});

describe('checkIfSpamFeed', () => {
  it('marks feeds as spam when item counts hit or exceed the threshold', () => {
    expect(checkIfSpamFeed({ items: new Array(10_000), podcastLiveItems: [] })).toBe(true);
    expect(checkIfSpamFeed({ items: new Array(9_999), podcastLiveItems: [] })).toBe(false);
  });

  it('marks feeds as spam when live-item counts hit or exceed the threshold', () => {
    expect(checkIfSpamFeed({ items: [], podcastLiveItems: new Array(10_000) })).toBe(true);
    expect(checkIfSpamFeed({ items: [], podcastLiveItems: new Array(9_999) })).toBe(false);
  });

  it('returns false for undefined or missing arrays', () => {
    expect(checkIfSpamFeed(undefined)).toBe(false);
    expect(checkIfSpamFeed({})).toBe(false);
  });
});
