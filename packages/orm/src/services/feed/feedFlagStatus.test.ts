import { beforeEach, describe, expect, it, vi } from 'vitest';

const findOneMock = vi.fn();
const findMock = vi.fn();

vi.mock('@orm/db/index.js', () => ({
  AppDataSourceRead: {
    getRepository: (_entity: unknown) => {
      if (_entity?.name === 'FeedFlagStatusReason') {
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
  FeedFlagStatusReasonService,
} from './feedFlagStatus.js';

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
