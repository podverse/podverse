import type { Feed } from '@orm/entities/feed/feed.js';
import { QueryFailedError } from 'typeorm';
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

vi.mock('@orm/lib/applyProperties.js', () => ({
  applyProperties: (obj: unknown, dto: unknown) => Object.assign(obj as object, dto as object),
}));

import { FeedService } from './feed.js';

describe('FeedService.getOrCreate', () => {
  beforeEach(() => {
    findOneMock.mockReset();
    saveMock.mockReset();
  });

  it('returns existing feed when unique podcast_index_id race occurs', async () => {
    const existingFeed = {
      id: 11,
      url: 'https://example.com/feed',
      podcast_index_id: 5778820,
    };
    const duplicateDriverError = Object.assign(new Error('duplicate key'), { code: '23505' });
    const uniqueViolation = new QueryFailedError('INSERT', [], duplicateDriverError);

    findOneMock.mockResolvedValueOnce(null).mockResolvedValueOnce(existingFeed);
    saveMock.mockRejectedValueOnce(uniqueViolation);

    const service = new FeedService();
    const result = await service.getOrCreate({
      url: 'https://example.com/feed',
      podcast_index_id: 5778820,
    });

    expect(result).toBe(existingFeed);
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it('does not write when unique race refetch finds different url', async () => {
    const existingFeed = {
      id: 11,
      url: 'https://canonical.example.com/feed',
      podcast_index_id: 5778820,
    };
    const duplicateDriverError = Object.assign(new Error('duplicate key'), { code: '23505' });
    const uniqueViolation = new QueryFailedError('INSERT', [], duplicateDriverError);

    findOneMock.mockResolvedValueOnce(null).mockResolvedValueOnce(existingFeed);
    saveMock.mockRejectedValueOnce(uniqueViolation);

    const service = new FeedService();
    const result = await service.getOrCreate({
      url: 'https://new.example.com/feed',
      podcast_index_id: 5778820,
    });

    expect(result).toBe(existingFeed);
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it('rethrows non-unique errors from create path', async () => {
    const createError = new Error('db unavailable');

    findOneMock.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 1 });
    saveMock.mockRejectedValueOnce(createError);

    const service = new FeedService();
    await expect(
      service.getOrCreate({
        url: 'https://example.com/feed',
        podcast_index_id: 5778820,
      })
    ).rejects.toThrow('db unavailable');
  });
});

describe('FeedService.create', () => {
  beforeEach(() => {
    findOneMock.mockReset();
    saveMock.mockReset();
  });

  it('persists url and podcast_index_id for new feeds', async () => {
    saveMock.mockImplementation((f: Feed) => f);

    const service = new FeedService();
    await service.create({ url: 'https://example.com/feed.xml', podcast_index_id: 42 });

    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://example.com/feed.xml',
        podcast_index_id: 42,
      })
    );
  });
});
