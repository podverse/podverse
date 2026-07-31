import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  feedGetByUrlMock,
  hasFollowedChannelMock,
  followChannelMock,
  hasFollowedAddByRSSChannelMock,
  addOrUpdateRSSChannelMock,
  addPendingFollowMock,
  mqRSSAddMock,
  mqAddByRSSAddMock,
} = vi.hoisted(() => ({
  feedGetByUrlMock: vi.fn(),
  hasFollowedChannelMock: vi.fn(),
  followChannelMock: vi.fn(),
  hasFollowedAddByRSSChannelMock: vi.fn(),
  addOrUpdateRSSChannelMock: vi.fn(),
  addPendingFollowMock: vi.fn(),
  mqRSSAddMock: vi.fn(async () => {}),
  mqAddByRSSAddMock: vi.fn(async () => {}),
}));

vi.mock('@podverse/orm', () => ({
  FeedService: class {
    getByUrl = feedGetByUrlMock;
  },
  AccountFollowingChannelService: class {
    hasFollowedChannel = hasFollowedChannelMock;
    followChannel = followChannelMock;
  },
  AccountFollowingAddByRSSChannelService: class {
    hasFollowedAddByRSSChannel = hasFollowedAddByRSSChannelMock;
    addOrUpdateRSSChannel = addOrUpdateRSSChannelMock;
  },
  AccountPendingFollowingChannelService: class {
    addPendingFollow = addPendingFollowMock;
  },
}));

vi.mock('./add.js', () => ({
  mqRSSAdd: mqRSSAddMock,
}));

vi.mock('./addByRSS.js', () => ({
  mqAddByRSSAdd: mqAddByRSSAddMock,
}));

import { processOpmlImportJob } from './processOpmlImport.js';

type CacheStore = Map<string, unknown>;

const createMemoryCache = () => {
  const store: CacheStore = new Map();
  return {
    store,
    cacheGetJson: async <T>(key: string): Promise<T | null> => {
      const value = store.get(key);
      if (value === undefined) {
        return null;
      }
      return value as T;
    },
    cacheSetJson: async <T>(key: string, value: T): Promise<void> => {
      store.set(key, value);
    },
  };
};

describe('processOpmlImportJob', () => {
  beforeEach(() => {
    feedGetByUrlMock.mockReset();
    hasFollowedChannelMock.mockReset();
    followChannelMock.mockReset();
    hasFollowedAddByRSSChannelMock.mockReset();
    addOrUpdateRSSChannelMock.mockReset();
    addPendingFollowMock.mockReset();
    mqRSSAddMock.mockReset();
    mqAddByRSSAddMock.mockReset();

    feedGetByUrlMock.mockResolvedValue(null);
    hasFollowedChannelMock.mockResolvedValue(false);
    followChannelMock.mockResolvedValue({});
    hasFollowedAddByRSSChannelMock.mockResolvedValue(false);
    addOrUpdateRSSChannelMock.mockResolvedValue({});
    addPendingFollowMock.mockResolvedValue({});
  });

  it('subscribes directory feeds and does not consume rate budget', async () => {
    const { cacheGetJson, cacheSetJson } = createMemoryCache();
    feedGetByUrlMock.mockResolvedValueOnce({
      channel: { id_text: 'ch-1' },
    });

    const podcastGetByFeedUrl = vi.fn(async () => null);
    const result = await processOpmlImportJob({
      accountId: 9,
      requestId: 'req-1',
      feeds: [{ feedUrl: 'https://example.com/dir.xml', title: 'Dir' }],
      maxFeedsPerHour: 50,
      cacheGetJson,
      cacheSetJson,
      activeMQArtemisService: {} as never,
      podcastGetByFeedUrl,
      enqueueDownstreamJobs: true,
    });

    expect(result.status).toBe('completed');
    expect(result.results[0]?.outcome).toBe('subscribed');
    expect(followChannelMock).toHaveBeenCalledWith(9, 'ch-1');
    expect(podcastGetByFeedUrl).not.toHaveBeenCalled();
    expect(result.totals.subscribed).toBe(1);
  });

  it('reports already_subscribed when directory channel is already followed', async () => {
    const { cacheGetJson, cacheSetJson } = createMemoryCache();
    feedGetByUrlMock.mockResolvedValueOnce({
      channel: { id_text: 'ch-1' },
    });
    hasFollowedChannelMock.mockResolvedValueOnce(true);

    const result = await processOpmlImportJob({
      accountId: 9,
      requestId: 'req-2',
      feeds: [{ feedUrl: 'https://example.com/dir.xml' }],
      maxFeedsPerHour: 50,
      cacheGetJson,
      cacheSetJson,
      activeMQArtemisService: {} as never,
      podcastGetByFeedUrl: async () => null,
    });

    expect(result.results[0]?.outcome).toBe('already_subscribed');
    expect(result.totals.skippedExisting).toBe(1);
    expect(followChannelMock).not.toHaveBeenCalled();
  });

  it('enqueues indexed parse + pending follow when PI finds the feed', async () => {
    const { cacheGetJson, cacheSetJson } = createMemoryCache();

    const result = await processOpmlImportJob({
      accountId: 9,
      requestId: 'req-3',
      feeds: [{ feedUrl: 'https://example.com/pi.xml', title: 'PI' }],
      maxFeedsPerHour: 50,
      cacheGetJson,
      cacheSetJson,
      activeMQArtemisService: {} as never,
      podcastGetByFeedUrl: async () => ({ podcast_index_id: 12345 }),
    });

    expect(result.results[0]?.outcome).toBe('enqueued_indexed');
    expect(addPendingFollowMock).toHaveBeenCalledWith(9, {
      podcast_index_id: 12345,
      feed_url: 'https://example.com/pi.xml',
    });
    expect(mqRSSAddMock).toHaveBeenCalled();
    expect(result.totals.enqueuedIndexed).toBe(1);
  });

  it('adds by RSS when not in DB and not in PI', async () => {
    const { cacheGetJson, cacheSetJson } = createMemoryCache();

    const result = await processOpmlImportJob({
      accountId: 9,
      requestId: 'req-4',
      feeds: [{ feedUrl: 'https://example.com/unknown.xml', title: 'Unknown' }],
      maxFeedsPerHour: 50,
      cacheGetJson,
      cacheSetJson,
      activeMQArtemisService: {} as never,
      podcastGetByFeedUrl: async () => null,
    });

    expect(result.results[0]?.outcome).toBe('added_by_rss');
    expect(addOrUpdateRSSChannelMock).toHaveBeenCalledWith(9, {
      feed_url: 'https://example.com/unknown.xml',
      title: 'Unknown',
    });
    expect(mqAddByRSSAddMock).toHaveBeenCalled();
    expect(result.totals.addedByRss).toBe(1);
  });

  it('isolates per-feed failures and completes the run', async () => {
    const { cacheGetJson, cacheSetJson } = createMemoryCache();
    feedGetByUrlMock
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ channel: { id_text: 'ch-2' } });

    const result = await processOpmlImportJob({
      accountId: 9,
      requestId: 'req-5',
      feeds: [
        { feedUrl: 'https://example.com/bad.xml' },
        { feedUrl: 'https://example.com/ok.xml' },
      ],
      maxFeedsPerHour: 50,
      cacheGetJson,
      cacheSetJson,
      activeMQArtemisService: {} as never,
      podcastGetByFeedUrl: async () => null,
    });

    expect(result.status).toBe('completed');
    expect(result.results[0]?.outcome).toBe('failed');
    expect(result.results[0]?.error).toBe('boom');
    expect(result.results[1]?.outcome).toBe('subscribed');
    expect(result.totals.failed).toBe(1);
    expect(result.totals.subscribed).toBe(1);
  });

  it('rate-limits new feeds after budget but still subscribes later directory matches', async () => {
    const { cacheGetJson, cacheSetJson } = createMemoryCache();
    feedGetByUrlMock.mockImplementation(async ({ url }: { url: string }) => {
      if (url.includes('dir-later')) {
        return { channel: { id_text: 'ch-later' } };
      }
      return null;
    });

    const result = await processOpmlImportJob({
      accountId: 9,
      requestId: 'req-6',
      feeds: [
        { feedUrl: 'https://example.com/new-1.xml' },
        { feedUrl: 'https://example.com/new-2.xml' },
        { feedUrl: 'https://example.com/dir-later.xml' },
      ],
      maxFeedsPerHour: 1,
      cacheGetJson,
      cacheSetJson,
      activeMQArtemisService: {} as never,
      podcastGetByFeedUrl: async () => null,
    });

    expect(result.results.map((row) => row.outcome)).toEqual([
      'added_by_rss',
      'rate_limited',
      'subscribed',
    ]);
    expect(result.rateLimited?.limit).toBe(1);
    expect(result.rateLimited?.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.totals.rateLimited).toBe(1);
    expect(result.totals.subscribed).toBe(1);
    expect(result.totals.addedByRss).toBe(1);
  });
});
