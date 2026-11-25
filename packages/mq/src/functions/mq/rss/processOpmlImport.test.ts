import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ADD_BY_RSS_DISABLED_MESSAGE,
  addByRssFeedLimitReachedMessage,
  followLimitReachedMessage,
} from '@podverse/helpers';

const {
  catalogAllowlistTableAdmitsMock,
  findBlockedFeedMock,
  feedGetByUrlMock,
  hasFollowedChannelMock,
  followChannelMock,
  hasFollowedAddByRSSChannelMock,
  addOrUpdateRSSChannelMock,
  addPendingFollowMock,
  mqRSSAddMock,
  mqAddByRSSAddMock,
  AddByRssFeedLimitReachedError,
  FollowLimitReachedError,
} = vi.hoisted(() => {
  class AddByRssFeedLimitReachedError extends Error {
    readonly limit: number;
    readonly code = 'add_by_rss_feed_limit_reached';
    readonly i18nKey = 'membership.add_by_rss_feed_limit_reached';

    constructor(limit: number) {
      super('add_by_rss_feed_limit_reached');
      this.name = 'AddByRssFeedLimitReachedError';
      this.limit = limit;
    }
  }

  return {
    catalogAllowlistTableAdmitsMock: vi.fn(async () => false),
    findBlockedFeedMock: vi.fn(),
    feedGetByUrlMock: vi.fn(),
    hasFollowedChannelMock: vi.fn(),
    followChannelMock: vi.fn(),
    hasFollowedAddByRSSChannelMock: vi.fn(),
    addOrUpdateRSSChannelMock: vi.fn(),
    addPendingFollowMock: vi.fn(),
    mqRSSAddMock: vi.fn(async () => {}),
    mqAddByRSSAddMock: vi.fn(async () => {}),
    AddByRssFeedLimitReachedError,
    FollowLimitReachedError: class FollowLimitReachedError extends Error {
      readonly limit: number;
      readonly code = 'follow_limit_reached';
      readonly i18nKey = 'membership.follow_limit_reached';

      constructor(limit: number) {
        super('follow_limit_reached');
        this.name = 'FollowLimitReachedError';
        this.limit = limit;
      }
    },
  };
});

vi.mock('@podverse/orm', () => ({
  catalogAllowlistTableAdmits: catalogAllowlistTableAdmitsMock,
  findBlockedFeed: findBlockedFeedMock,
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
  AddByRssFeedLimitReachedError,
  FollowLimitReachedError,
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
    catalogAllowlistTableAdmitsMock.mockReset();
    catalogAllowlistTableAdmitsMock.mockResolvedValue(false);
    findBlockedFeedMock.mockReset();
    feedGetByUrlMock.mockReset();
    hasFollowedChannelMock.mockReset();
    followChannelMock.mockReset();
    hasFollowedAddByRSSChannelMock.mockReset();
    addOrUpdateRSSChannelMock.mockReset();
    addPendingFollowMock.mockReset();
    mqRSSAddMock.mockReset();
    mqAddByRSSAddMock.mockReset();

    findBlockedFeedMock.mockResolvedValue(null);
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

  it('reports a feed Podcast Index does not know as failed when Add by RSS is off', async () => {
    const { cacheGetJson, cacheSetJson } = createMemoryCache();

    const result = await processOpmlImportJob({
      accountId: 9,
      requestId: 'req-add-by-rss-off',
      feeds: [{ feedUrl: 'https://example.com/unknown.xml', title: 'Unknown' }],
      maxFeedsPerHour: 50,
      cacheGetJson,
      cacheSetJson,
      activeMQArtemisService: {} as never,
      podcastGetByFeedUrl: async () => null,
      enqueueDownstreamJobs: true,
      addByRSSEnabled: false,
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.outcome).toBe('failed');
    expect(result.results[0]?.error).toBe(ADD_BY_RSS_DISABLED_MESSAGE);
    expect(result.totals.failed).toBe(1);
    expect(addOrUpdateRSSChannelMock).not.toHaveBeenCalled();
    expect(mqAddByRSSAddMock).not.toHaveBeenCalled();
  });

  it('still enqueues a feed Podcast Index knows when Add by RSS is off', async () => {
    const { cacheGetJson, cacheSetJson } = createMemoryCache();

    const result = await processOpmlImportJob({
      accountId: 9,
      requestId: 'req-3-add-by-rss-off',
      feeds: [{ feedUrl: 'https://example.com/pi.xml', title: 'PI' }],
      maxFeedsPerHour: 50,
      cacheGetJson,
      cacheSetJson,
      activeMQArtemisService: {} as never,
      podcastGetByFeedUrl: async () => ({ podcast_index_id: 12345 }),
      addByRSSEnabled: false,
    });

    expect(result.results[0]?.outcome).toBe('enqueued_indexed');
    expect(addPendingFollowMock).toHaveBeenCalled();
    expect(addOrUpdateRSSChannelMock).not.toHaveBeenCalled();
  });

  it('treats an off-list Podcast Index feed as unindexed and adds it by RSS', async () => {
    const { cacheGetJson, cacheSetJson } = createMemoryCache();

    const result = await processOpmlImportJob({
      accountId: 9,
      requestId: 'req-off-list',
      feeds: [{ feedUrl: 'https://example.com/off-list.xml', title: 'Off List' }],
      maxFeedsPerHour: 50,
      cacheGetJson,
      cacheSetJson,
      activeMQArtemisService: {} as never,
      podcastGetByFeedUrl: async () => ({ podcast_index_id: 12345 }),
      catalogPodcastIndexIdAllowlist: [999],
    });

    expect(result.results[0]?.outcome).toBe('added_by_rss');
    expect(addPendingFollowMock).not.toHaveBeenCalled();
    expect(mqRSSAddMock).not.toHaveBeenCalled();
    expect(findBlockedFeedMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ podcastIndexId: 12345 })
    );
    expect(addOrUpdateRSSChannelMock).toHaveBeenCalledWith(9, {
      feed_url: 'https://example.com/off-list.xml',
      title: 'Off List',
    });
    expect(catalogAllowlistTableAdmitsMock).toHaveBeenCalledWith([12345]);
  });

  it('keeps the indexed path when the allowlist table admits the feed', async () => {
    const { cacheGetJson, cacheSetJson } = createMemoryCache();
    catalogAllowlistTableAdmitsMock.mockResolvedValue(true);

    const result = await processOpmlImportJob({
      accountId: 9,
      requestId: 'req-table',
      feeds: [{ feedUrl: 'https://example.com/table.xml', title: 'Table' }],
      maxFeedsPerHour: 50,
      cacheGetJson,
      cacheSetJson,
      activeMQArtemisService: {} as never,
      podcastGetByFeedUrl: async () => ({ podcast_index_id: 12345 }),
      catalogPodcastIndexIdAllowlist: [999],
    });

    expect(result.results[0]?.outcome).toBe('enqueued_indexed');
    expect(catalogAllowlistTableAdmitsMock).toHaveBeenCalledWith([12345]);
  });

  it('keeps the indexed path for a listed Podcast Index feed', async () => {
    const { cacheGetJson, cacheSetJson } = createMemoryCache();

    const result = await processOpmlImportJob({
      accountId: 9,
      requestId: 'req-listed',
      feeds: [{ feedUrl: 'https://example.com/listed.xml', title: 'Listed' }],
      maxFeedsPerHour: 50,
      cacheGetJson,
      cacheSetJson,
      activeMQArtemisService: {} as never,
      podcastGetByFeedUrl: async () => ({ podcast_index_id: 12345 }),
      catalogPodcastIndexIdAllowlist: [12345],
    });

    expect(result.results[0]?.outcome).toBe('enqueued_indexed');
    expect(addPendingFollowMock).toHaveBeenCalledWith(9, {
      podcast_index_id: 12345,
      feed_url: 'https://example.com/listed.xml',
    });
  });

  it('subscribes a stored feed whatever the allowlist', async () => {
    const { cacheGetJson, cacheSetJson } = createMemoryCache();
    feedGetByUrlMock.mockResolvedValueOnce({
      channel: { id_text: 'ch-1' },
    });
    const podcastGetByFeedUrl = vi.fn(async () => ({ podcast_index_id: 12345 }));

    const result = await processOpmlImportJob({
      accountId: 9,
      requestId: 'req-stored',
      feeds: [{ feedUrl: 'https://example.com/stored.xml', title: 'Stored' }],
      maxFeedsPerHour: 50,
      cacheGetJson,
      cacheSetJson,
      activeMQArtemisService: {} as never,
      podcastGetByFeedUrl,
      catalogPodcastIndexIdAllowlist: [999],
    });

    expect(result.results[0]?.outcome).toBe('subscribed');
    expect(podcastGetByFeedUrl).not.toHaveBeenCalled();
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

  it('blocks a flagged URL before following or enqueueing, and does not spend rate budget', async () => {
    const { cacheGetJson, cacheSetJson } = createMemoryCache();
    findBlockedFeedMock.mockImplementation(async ({ url }: { url?: string }) =>
      url?.includes('blocked') ? { id: 4 } : null
    );
    feedGetByUrlMock.mockImplementation(async ({ url }: { url: string }) => {
      if (url.includes('blocked')) {
        return { channel: { id_text: 'ch-blocked' } };
      }
      return null;
    });

    const result = await processOpmlImportJob({
      accountId: 9,
      requestId: 'req-blocked',
      feeds: [
        { feedUrl: 'https://example.com/blocked.xml', title: 'Blocked' },
        { feedUrl: 'https://example.com/unknown.xml', title: 'Unknown' },
      ],
      maxFeedsPerHour: 1,
      cacheGetJson,
      cacheSetJson,
      activeMQArtemisService: {} as never,
      podcastGetByFeedUrl: async () => null,
    });

    expect(result.results.map((row) => row.outcome)).toEqual(['blocked', 'added_by_rss']);
    expect(result.totals.blocked).toBe(1);
    expect(result.totals.addedByRss).toBe(1);
    expect(followChannelMock).not.toHaveBeenCalled();
    expect(addPendingFollowMock).not.toHaveBeenCalled();
    expect(mqRSSAddMock).not.toHaveBeenCalled();
  });

  it('blocks an indexed feed by Podcast Index id before a pending follow or enqueue', async () => {
    const { cacheGetJson, cacheSetJson } = createMemoryCache();
    findBlockedFeedMock.mockImplementation(
      async ({ podcastIndexId }: { podcastIndexId?: number | null }) =>
        podcastIndexId === 12345 ? { id: 9 } : null
    );

    const result = await processOpmlImportJob({
      accountId: 9,
      requestId: 'req-blocked-index',
      feeds: [{ feedUrl: 'https://example.com/pi.xml' }],
      maxFeedsPerHour: 50,
      cacheGetJson,
      cacheSetJson,
      activeMQArtemisService: {} as never,
      podcastGetByFeedUrl: async () => ({ podcast_index_id: 12345 }),
    });

    expect(result.results[0]?.outcome).toBe('blocked');
    expect(result.totals.blocked).toBe(1);
    expect(addPendingFollowMock).not.toHaveBeenCalled();
    expect(mqRSSAddMock).not.toHaveBeenCalled();
    expect(result.totals.enqueuedIndexed).toBe(0);
  });

  it('stops new Add by RSS feeds at the tier and keeps the limit sentence', async () => {
    const { cacheGetJson, cacheSetJson } = createMemoryCache();
    hasFollowedAddByRSSChannelMock.mockImplementation(async (_accountId: number, feedUrl: string) =>
      feedUrl.includes('already')
    );
    feedGetByUrlMock.mockImplementation(async ({ url }: { url: string }) => {
      if (url.includes('dir-later')) {
        return { channel: { id_text: 'ch-later' } };
      }
      return null;
    });
    addOrUpdateRSSChannelMock.mockRejectedValueOnce(new AddByRssFeedLimitReachedError(100));

    const result = await processOpmlImportJob({
      accountId: 9,
      requestId: 'req-feed-limit',
      feeds: [
        { feedUrl: 'https://example.com/new-a.xml', title: 'New A' },
        { feedUrl: 'https://example.com/already.xml', title: 'Already' },
        { feedUrl: 'https://example.com/new-b.xml', title: 'New B' },
        { feedUrl: 'https://example.com/dir-later.xml', title: 'Directory' },
      ],
      maxFeedsPerHour: 50,
      cacheGetJson,
      cacheSetJson,
      activeMQArtemisService: {} as never,
      podcastGetByFeedUrl: async () => null,
      contactEmail: 'support@example.com',
    });

    expect(result.status).toBe('completed');
    expect(result.results.map((row) => row.outcome)).toEqual([
      'feed_limit_reached',
      'already_subscribed',
      'feed_limit_reached',
      'subscribed',
    ]);
    expect(result.results[0]?.limit).toBe(100);
    expect(result.results[0]?.error).toBe(
      addByRssFeedLimitReachedMessage(100, 'support@example.com')
    );
    expect(result.results[2]?.error).toBe(
      addByRssFeedLimitReachedMessage(100, 'support@example.com')
    );
    expect(result.totals.feedLimitReached).toBe(2);
    expect(result.totals.skippedExisting).toBe(1);
    expect(result.totals.subscribed).toBe(1);
    expect(result.totals.addedByRss).toBe(0);
    expect(addOrUpdateRSSChannelMock).toHaveBeenCalledTimes(1);
    expect(followChannelMock).toHaveBeenCalledWith(9, 'ch-later');
    expect(mqAddByRSSAddMock).not.toHaveBeenCalled();
  });

  it('stops new directory follows at the tier and keeps the follow sentence', async () => {
    const { cacheGetJson, cacheSetJson } = createMemoryCache();
    hasFollowedChannelMock.mockImplementation(
      async (_accountId: number, channelIdText: string) => channelIdText === 'ch-already'
    );
    feedGetByUrlMock.mockImplementation(async ({ url }: { url: string }) => {
      if (url.includes('already')) {
        return { channel: { id_text: 'ch-already' } };
      }
      if (url.includes('later')) {
        return { channel: { id_text: 'ch-later' } };
      }
      return { channel: { id_text: 'ch-new' } };
    });
    followChannelMock.mockRejectedValueOnce(new FollowLimitReachedError(500));

    const result = await processOpmlImportJob({
      accountId: 9,
      requestId: 'req-follow-limit',
      feeds: [
        { feedUrl: 'https://example.com/new-a.xml', title: 'New A' },
        { feedUrl: 'https://example.com/already.xml', title: 'Already' },
        { feedUrl: 'https://example.com/later.xml', title: 'Later' },
      ],
      maxFeedsPerHour: 50,
      cacheGetJson,
      cacheSetJson,
      activeMQArtemisService: {} as never,
      podcastGetByFeedUrl: async () => null,
      contactEmail: 'support@example.com',
    });

    expect(result.results.map((row) => row.outcome)).toEqual([
      'follow_limit',
      'already_subscribed',
      'follow_limit',
    ]);
    expect(result.results[0]?.limit).toBe(500);
    expect(result.results[0]?.error).toBe(followLimitReachedMessage(500));
    expect(result.totals.followLimitReached).toBe(2);
    expect(result.totals.skippedExisting).toBe(1);
    expect(followChannelMock).toHaveBeenCalledTimes(1);
  });
});
