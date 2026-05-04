import { beforeEach, describe, expect, it, vi } from 'vitest';

const findOneMock = vi.fn();
const findMock = vi.fn();

vi.mock('@orm/db/index.js', () => ({
  AppDataSourceRead: {
    getRepository: (_entity: unknown) => {
      if ((_entity as { name?: string } | undefined)?.name === 'FeedFlagStatusReason') {
        return { findOne: findOneMock, find: findMock };
      }
      return { findOne: findOneMock };
    },
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
    SpamPermitted: 7,
  },
}));

vi.mock('@orm/entities/feed/feedFlagStatusReason.js', () => ({
  FeedFlagStatusReason: class FeedFlagStatusReason {},
  FeedFlagStatusReasonEnum: {
    Copyright: 1,
    IllegalContent: 2,
    Spam: 3,
    Malware: 4,
    DeadFeed: 5,
    OwnerRequest: 6,
    Other: 7,
  },
}));

import {
  checkIfFeedFlagStatusShouldParse,
  checkIfSpamFeed,
  DEFAULT_SPAM_FEED_ITEM_THRESHOLDS,
  FeedFlagStatusReasonService,
  resolveSpamFeedItemThresholds,
} from './feedFlagStatus.js';

describe('checkIfFeedFlagStatusShouldParse', () => {
  it('allows Active, AlwaysParse, and SpamPermitted statuses', () => {
    expect(checkIfFeedFlagStatusShouldParse(1)).toBe(true);
    expect(checkIfFeedFlagStatusShouldParse(2)).toBe(true);
    expect(checkIfFeedFlagStatusShouldParse(7)).toBe(true);
  });

  it('blocks non-allowed statuses', () => {
    expect(checkIfFeedFlagStatusShouldParse(3)).toBe(false);
    expect(checkIfFeedFlagStatusShouldParse(4)).toBe(false);
    expect(checkIfFeedFlagStatusShouldParse(5)).toBe(false);
    expect(checkIfFeedFlagStatusShouldParse(6)).toBe(false);
  });
});

describe('checkIfSpamFeed', () => {
  const t = DEFAULT_SPAM_FEED_ITEM_THRESHOLDS;

  it('uses default threshold for normal parse-eligible statuses', () => {
    expect(checkIfSpamFeed({ items: new Array(10_000), podcastLiveItems: [] }, 1, t)).toBe(true);
    expect(checkIfSpamFeed({ items: new Array(9_999), podcastLiveItems: [] }, 1, t)).toBe(false);
  });

  it('uses spam-permitted threshold for SpamPermitted status', () => {
    expect(checkIfSpamFeed({ items: new Array(100_000), podcastLiveItems: [] }, 7, t)).toBe(true);
    expect(checkIfSpamFeed({ items: new Array(99_999), podcastLiveItems: [] }, 7, t)).toBe(false);
    expect(checkIfSpamFeed({ items: [], podcastLiveItems: new Array(100_000) }, 7, t)).toBe(true);
    expect(checkIfSpamFeed({ items: [], podcastLiveItems: new Array(99_999) }, 7, t)).toBe(false);
  });

  it('uses default threshold for channel-level podcastRemoteItems', () => {
    expect(
      checkIfSpamFeed(
        { items: [], podcastLiveItems: [], podcastRemoteItems: new Array(10_000) },
        1,
        t
      )
    ).toBe(true);
    expect(
      checkIfSpamFeed(
        { items: [], podcastLiveItems: [], podcastRemoteItems: new Array(9_999) },
        1,
        t
      )
    ).toBe(false);
  });

  it('uses spam-permitted threshold for podcastRemoteItems', () => {
    expect(
      checkIfSpamFeed(
        { items: [], podcastLiveItems: [], podcastRemoteItems: new Array(100_000) },
        7,
        t
      )
    ).toBe(true);
    expect(
      checkIfSpamFeed(
        { items: [], podcastLiveItems: [], podcastRemoteItems: new Array(99_999) },
        7,
        t
      )
    ).toBe(false);
  });

  it('respects custom thresholds', () => {
    expect(
      checkIfSpamFeed({ items: new Array(5), podcastLiveItems: [] }, 1, {
        defaultLimit: 5,
        spamPermittedLimit: 100_000,
      })
    ).toBe(true);
  });

  it('returns false for undefined or missing arrays', () => {
    expect(checkIfSpamFeed(undefined, 1, t)).toBe(false);
    expect(checkIfSpamFeed({}, 1, t)).toBe(false);
    expect(
      checkIfSpamFeed({ items: [], podcastLiveItems: [], podcastRemoteItems: undefined }, 1, t)
    ).toBe(false);
  });
});

describe('resolveSpamFeedItemThresholds', () => {
  it('returns original thresholds when override is null', () => {
    const thresholds = {
      defaultLimit: 11_000,
      spamPermittedLimit: 99_000,
    };
    expect(resolveSpamFeedItemThresholds(thresholds, null)).toEqual(thresholds);
  });

  it('uses override for both thresholds when override exists', () => {
    expect(
      resolveSpamFeedItemThresholds(
        {
          defaultLimit: 10_000,
          spamPermittedLimit: 100_000,
        },
        12_345
      )
    ).toEqual({
      defaultLimit: 12_345,
      spamPermittedLimit: 12_345,
    });
  });
});

describe('FeedFlagStatusReasonService', () => {
  beforeEach(() => {
    findOneMock.mockReset();
    findMock.mockReset();
  });

  it('returns a reason by id', async () => {
    const mockReason = { id: 1, reason: 'Copyright' };
    findOneMock.mockResolvedValue(mockReason);

    const service = new FeedFlagStatusReasonService();
    const result = await service.get(1);

    expect(result).toEqual(mockReason);
  });

  it('returns null for non-existent reason', async () => {
    findOneMock.mockResolvedValue(null);

    const service = new FeedFlagStatusReasonService();
    const result = await service.get(999);

    expect(result).toBeNull();
  });

  it('lists all reasons ordered by id', async () => {
    const mockReasons = [
      { id: 1, reason: 'Copyright' },
      { id: 2, reason: 'IllegalContent' },
      { id: 3, reason: 'Spam' },
    ];
    findMock.mockResolvedValue(mockReasons);

    const service = new FeedFlagStatusReasonService();
    const result = await service.list();

    expect(result).toEqual(mockReasons);
  });
});
