import { beforeEach, describe, expect, it, vi } from 'vitest';

const findOneMock = vi.fn();
const findMock = vi.fn();

vi.mock('@orm/db/index.js', () => ({
  AppDataSourceRead: {
    getRepository: (_entity: unknown) => {
      if ((_entity as { name?: string } | undefined)?.name === 'FeedTakedownReason') {
        return { findOne: findOneMock, find: findMock };
      }
      return { findOne: findOneMock };
    },
  },
}));

vi.mock('@orm/entities/feed/feedTakedownReason.js', () => ({
  FeedTakedownReason: class FeedTakedownReason {},
  FeedTakedownReasonEnum: {
    Copyright: 1,
    IllegalContent: 2,
    Spam: 3,
    Malware: 4,
    DeadFeed: 5,
    OwnerRequest: 6,
    Other: 7,
  },
}));

import { FeedTakedownReasonService } from './feedTakedownReason.js';

describe('FeedTakedownReasonService', () => {
  beforeEach(() => {
    findOneMock.mockReset();
    findMock.mockReset();
  });

  it('returns a reason by id', async () => {
    const mockReason = { id: 1, reason: 'Copyright' };
    findOneMock.mockResolvedValue(mockReason);

    const service = new FeedTakedownReasonService();
    const result = await service.get(1);

    expect(result).toEqual(mockReason);
  });

  it('returns null for non-existent reason', async () => {
    findOneMock.mockResolvedValue(null);

    const service = new FeedTakedownReasonService();
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

    const service = new FeedTakedownReasonService();
    const result = await service.list();

    expect(result).toEqual(mockReasons);
  });
});
