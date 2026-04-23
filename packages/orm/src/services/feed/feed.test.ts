import type { Feed } from '@orm/entities/feed/feed.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const findOneMock = vi.fn();
const saveMock = vi.fn();

vi.mock('@orm/db/index.js', () => ({
  AppDataSourceRead: {
    getRepository: (_entity: unknown) => ({
      findOne: findOneMock,
    }),
  },
  AppDataSourceReadWrite: {
    getRepository: () => ({
      save: saveMock,
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

vi.mock('@orm/lib/applyProperties.js', () => ({
  applyProperties: (obj: unknown, dto: unknown) => Object.assign(obj, dto),
}));

import { FeedService } from './feed.js';

describe('FeedService.updateFlagStatus', () => {
  beforeEach(() => {
    findOneMock.mockReset();
    saveMock.mockReset();
  });

  it('updates feed flag status without reason', async () => {
    const mockFeed = {
      id: 1,
      feed_flag_status: null,
      feed_flag_status_reason: null,
      feed_flag_status_reason_note: null,
    };
    const mockStatus = { id: 3, status: 'spam' };

    findOneMock.mockResolvedValue(mockStatus);
    saveMock.mockImplementation((feed: unknown) => feed);

    const service = new FeedService();
    const result = await service.updateFlagStatus(mockFeed as Partial<Feed> as Feed, 3);

    expect(result.feed_flag_status).toBe(mockStatus);
    expect(result.feed_flag_status_reason).toBeNull();
    expect(result.feed_flag_status_reason_note).toBeNull();
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it('updates feed flag status with reason id and note', async () => {
    const mockFeed = {
      id: 1,
      feed_flag_status: null,
      feed_flag_status_reason: null,
      feed_flag_status_reason_note: null,
    };
    const mockStatus = { id: 6, status: 'takedown' };
    const mockReason = { id: 1, reason: 'Copyright' };

    findOneMock.mockResolvedValueOnce(mockStatus).mockResolvedValueOnce(mockReason);
    saveMock.mockImplementation((feed: unknown) => feed);

    const service = new FeedService();
    const result = await service.updateFlagStatus(mockFeed as Partial<Feed> as Feed, 6, {
      feed_flag_status_reason_id: 1,
      feed_flag_status_reason_note: 'DMCA takedown notice received',
    });

    expect(result.feed_flag_status).toBe(mockStatus);
    expect(result.feed_flag_status_reason).toBe(mockReason);
    expect(result.feed_flag_status_reason_note).toBe('DMCA takedown notice received');
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it('clears reason when updating status without reason id', async () => {
    const mockFeed = {
      id: 1,
      feed_flag_status: { id: 3 },
      feed_flag_status_reason: { id: 1, reason: 'Copyright' },
      feed_flag_status_reason_note: 'Previous note',
    };
    const mockStatus = { id: 1, status: 'active' };

    findOneMock.mockResolvedValue(mockStatus);
    saveMock.mockImplementation((feed: unknown) => feed);

    const service = new FeedService();
    const result = await service.updateFlagStatus(mockFeed as Partial<Feed> as Feed, 1);

    expect(result.feed_flag_status).toBe(mockStatus);
    expect(result.feed_flag_status_reason).toBeNull();
    expect(result.feed_flag_status_reason_note).toBeNull();
  });

  it('throws when status id is not found', async () => {
    const mockFeed = { id: 1 };

    findOneMock.mockResolvedValue(null);

    const service = new FeedService();
    await expect(service.updateFlagStatus(mockFeed as Partial<Feed> as Feed, 999)).rejects.toThrow(
      'FeedService.updateFlagStatus: feed status 999 not found'
    );
  });

  it('throws when reason id is not found', async () => {
    const mockFeed = { id: 1 };
    const mockStatus = { id: 3, status: 'spam' };

    findOneMock.mockResolvedValueOnce(mockStatus).mockResolvedValueOnce(null);

    const service = new FeedService();
    await expect(
      service.updateFlagStatus(mockFeed as Partial<Feed> as Feed, 3, {
        feed_flag_status_reason_id: 999,
      })
    ).rejects.toThrow('FeedService.updateFlagStatus: reason 999 not found');
  });
});
