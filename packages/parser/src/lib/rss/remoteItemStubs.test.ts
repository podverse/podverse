import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getAllByPodcastGuidsMock,
  channelGetMock,
  feedGetByUrlMock,
  feedGetByPodcastIndexIdMock,
  getChannelStubsForRefsMock,
  upsertChannelStubMock,
  deleteForParsedFeedMock,
  getItemStubsForRefsMock,
  upsertItemStubMock,
  getOptionalIndexProviderMock,
  collectRemoteItemRefsMock,
  sleepMock,
  infoMock,
  logErrorMock,
} = vi.hoisted(() => ({
  getAllByPodcastGuidsMock: vi.fn(),
  channelGetMock: vi.fn(),
  feedGetByUrlMock: vi.fn(),
  feedGetByPodcastIndexIdMock: vi.fn(),
  getChannelStubsForRefsMock: vi.fn(),
  upsertChannelStubMock: vi.fn(),
  deleteForParsedFeedMock: vi.fn(),
  getItemStubsForRefsMock: vi.fn(),
  upsertItemStubMock: vi.fn(),
  getOptionalIndexProviderMock: vi.fn(),
  collectRemoteItemRefsMock: vi.fn(),
  sleepMock: vi.fn(),
  infoMock: vi.fn(),
  logErrorMock: vi.fn(),
}));

vi.mock('@parser/config/index.js', () => ({
  config: {
    podcastIndex: { rateLimitDelay: 250 },
  },
}));

vi.mock('@parser/context.js', () => ({
  getOptionalIndexProvider: getOptionalIndexProviderMock,
}));

vi.mock('@parser/factories/loggerService.js', () => ({
  loggerService: {
    info: infoMock,
    warn: vi.fn(),
    logError: logErrorMock,
  },
}));

vi.mock('@parser/lib/rss/remoteItemRefs.js', () => ({
  collectRemoteItemRefs: collectRemoteItemRefsMock,
}));

vi.mock('@podverse/helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/helpers')>();
  return {
    ...actual,
    sleep: sleepMock,
  };
});

vi.mock('@podverse/orm', () => {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  return {
    ChannelService: class ChannelService {
      getAllByPodcastGuids = getAllByPodcastGuidsMock;
      get = channelGetMock;
    },
    FeedService: class FeedService {
      getByUrl = feedGetByUrlMock;
      getByPodcastIndexId = feedGetByPodcastIndexIdMock;
    },
    RemoteChannelStubService: class RemoteChannelStubService {
      getChannelStubsForRefs = getChannelStubsForRefsMock;
      upsertChannelStub = upsertChannelStubMock;
      deleteForParsedFeed = deleteForParsedFeedMock;
    },
    RemoteItemStubService: class RemoteItemStubService {
      getItemStubsForRefs = getItemStubsForRefsMock;
      upsertItemStub = upsertItemStubMock;
    },
    normalizeRemoteStubFeedGuid: (value: string | null | undefined): string | null => {
      if (typeof value !== 'string') {
        return null;
      }
      const normalized = value.trim().toLowerCase();
      return uuidPattern.test(normalized) ? normalized : null;
    },
    normalizeRemoteStubFeedUrl: (value: string | null | undefined): string | null => {
      if (typeof value !== 'string') {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    },
  };
});

import type { IndexProvider, IndexProviderFeed, IndexProviderItem } from '@podverse/helpers';
import type { Channel, Feed, RemoteChannelStub, RemoteItemStub } from '@podverse/orm';

import type { ResolveRemoteStubsOptions } from './remoteItemStubs.js';
import {
  deleteRemoteStubsForParsedFeed,
  REMOTE_STUB_MAX_SINGLE_LOOKUPS_PER_RUN,
  REMOTE_STUB_REFRESH_AFTER_MS,
  resolveRemoteItemStubsForChannel,
  resolveRemoteStubsForRefs,
} from './remoteItemStubs.js';

const GUID_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const GUID_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const GUID_SELF = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const URL_A = 'https://a.example.com/feed.xml';
const URL_B = 'https://b.example.com/feed.xml';

const DAY_MS = 24 * 60 * 60 * 1000;

const options: ResolveRemoteStubsOptions = {
  rateLimitDelayMs: 250,
  maxSingleLookups: 100,
  refreshAfterMs: 7 * DAY_MS,
};

function makeProvider() {
  return {
    id: 'podcast_index',
    resolveFeed: vi.fn(),
    resolveFeedsByGuid: vi.fn(),
    getFeedById: vi.fn(),
    resolveItem: vi.fn(),
  } satisfies IndexProvider;
}

function providerFeed(overrides: Partial<IndexProviderFeed> = {}): IndexProviderFeed {
  return {
    indexProvider: 'podcast_index',
    providerFeedId: '1001',
    feedGuid: GUID_A,
    feedUrl: URL_A,
    title: 'Remote Show',
    author: 'Remote Author',
    description: null,
    imageUrl: 'https://a.example.com/art.jpg',
    medium: 'podcast',
    isDead: false,
    ...overrides,
  };
}

function providerItem(overrides: Partial<IndexProviderItem> = {}): IndexProviderItem {
  return {
    indexProvider: 'podcast_index',
    providerFeedId: '1001',
    providerItemId: '555',
    itemGuid: 'episode-1',
    title: 'Remote Episode',
    imageUrl: null,
    pubDate: null,
    durationSeconds: 1200,
    ...overrides,
  };
}

function channelStub(overrides: Partial<RemoteChannelStub> = {}): RemoteChannelStub {
  return {
    id: 70,
    index_provider: 'podcast_index',
    provider_feed_id: '1001',
    feed_guid: GUID_A,
    feed_url: URL_A,
    title: 'Remote Show',
    author: null,
    image_url: null,
    medium_id: null,
    resolved_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    aliases: [],
    item_stubs: [],
    ...overrides,
  };
}

function itemStub(
  parent: RemoteChannelStub,
  overrides: Partial<RemoteItemStub> = {}
): RemoteItemStub {
  return {
    id: 90,
    remote_channel_stub_id: parent.id,
    remote_channel_stub: parent,
    item_guid: 'episode-1',
    provider_item_id: null,
    title: null,
    image_url: null,
    pub_date: null,
    duration_seconds: null,
    resolved_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

let provider = makeProvider();

beforeEach(() => {
  vi.clearAllMocks();
  provider = makeProvider();
  provider.resolveFeedsByGuid.mockResolvedValue({ status: 'found', value: new Map() });
  provider.resolveFeed.mockResolvedValue({ status: 'not_found' });
  provider.resolveItem.mockResolvedValue({ status: 'not_found' });

  getAllByPodcastGuidsMock.mockResolvedValue([]);
  feedGetByUrlMock.mockResolvedValue(null);
  feedGetByPodcastIndexIdMock.mockResolvedValue(null);
  getChannelStubsForRefsMock.mockImplementation(async (refs: readonly unknown[]) =>
    refs.map(() => null)
  );
  upsertChannelStubMock.mockImplementation(async (feed: IndexProviderFeed) =>
    channelStub({
      provider_feed_id: feed.providerFeedId,
      feed_guid: feed.feedGuid,
      feed_url: feed.feedUrl,
    })
  );
  getItemStubsForRefsMock.mockImplementation(async (refs: readonly unknown[]) =>
    refs.map(() => null)
  );
  upsertItemStubMock.mockImplementation(async (parent: RemoteChannelStub) => itemStub(parent));
});

describe('resolveRemoteStubsForRefs', () => {
  it('stubs a GUID-only ref found by the batch without single-key calls', async () => {
    const feed = providerFeed();
    provider.resolveFeedsByGuid.mockResolvedValue({
      status: 'found',
      value: new Map([[GUID_A, feed]]),
    });

    const result = await resolveRemoteStubsForRefs(
      provider,
      [{ feedGuid: GUID_A, feedUrl: null, itemGuid: null }],
      options
    );

    expect(provider.resolveFeedsByGuid).toHaveBeenCalledWith([GUID_A]);
    expect(upsertChannelStubMock).toHaveBeenCalledTimes(1);
    expect(upsertChannelStubMock).toHaveBeenCalledWith(feed, [{ feedGuid: GUID_A, feedUrl: null }]);
    expect(result.outcomes).toEqual([{ status: 'stub', channelStub: expect.any(Object) }]);
    expect(result.channelStubsWritten).toBe(1);
    expect(provider.resolveFeed).not.toHaveBeenCalled();
    expect(provider.resolveItem).not.toHaveBeenCalled();
  });

  it('falls back to the feed URL on a batch miss and stubs a found feed', async () => {
    const feed = providerFeed({ feedGuid: GUID_B, feedUrl: URL_B, providerFeedId: '2002' });
    provider.resolveFeed.mockResolvedValue({ status: 'found', value: feed });

    const result = await resolveRemoteStubsForRefs(
      provider,
      [{ feedGuid: GUID_B, feedUrl: URL_B, itemGuid: null }],
      options
    );

    expect(provider.resolveFeed).toHaveBeenCalledWith({ feedGuid: null, feedUrl: URL_B });
    expect(upsertChannelStubMock).toHaveBeenCalledWith(feed, [
      { feedGuid: GUID_B, feedUrl: URL_B },
    ]);
    expect(result.outcomes[0]?.status).toBe('stub');
  });

  it('writes nothing for a feed the provider does not know', async () => {
    const result = await resolveRemoteStubsForRefs(
      provider,
      [
        { feedGuid: GUID_B, feedUrl: URL_B, itemGuid: null },
        { feedGuid: GUID_A, feedUrl: null, itemGuid: null },
      ],
      options
    );

    expect(provider.resolveFeed).toHaveBeenCalledTimes(1);
    expect(upsertChannelStubMock).not.toHaveBeenCalled();
    expect(result.outcomes).toEqual([{ status: 'not_found' }, { status: 'not_found' }]);
  });

  it('writes and deletes nothing when the batch lookup is unavailable', async () => {
    provider.resolveFeedsByGuid.mockResolvedValue({ status: 'unavailable' });

    const result = await resolveRemoteStubsForRefs(
      provider,
      [{ feedGuid: GUID_A, feedUrl: URL_A, itemGuid: null }],
      options
    );

    expect(upsertChannelStubMock).not.toHaveBeenCalled();
    expect(deleteForParsedFeedMock).not.toHaveBeenCalled();
    expect(provider.resolveFeed).not.toHaveBeenCalled();
    expect(result.outcomes).toEqual([{ status: 'unavailable' }]);
  });

  it('returns a stale stub as is when the batch lookup is unavailable', async () => {
    const stale = channelStub({ resolved_at: new Date(Date.now() - 30 * DAY_MS) });
    getChannelStubsForRefsMock.mockResolvedValue([stale]);
    provider.resolveFeedsByGuid.mockResolvedValue({ status: 'unavailable' });

    const result = await resolveRemoteStubsForRefs(
      provider,
      [{ feedGuid: GUID_A, feedUrl: null, itemGuid: null }],
      options
    );

    expect(upsertChannelStubMock).not.toHaveBeenCalled();
    expect(result.outcomes).toEqual([{ status: 'stub', channelStub: stale }]);
  });

  it('treats a GUID held by a parsed channel as parsed without calling the provider', async () => {
    getAllByPodcastGuidsMock.mockResolvedValue([{ id: 3, podcast_guid: GUID_A.toUpperCase() }]);

    const result = await resolveRemoteStubsForRefs(
      provider,
      [{ feedGuid: GUID_A, feedUrl: null, itemGuid: 'episode-1' }],
      options
    );

    expect(getAllByPodcastGuidsMock).toHaveBeenCalledWith(
      { select: { id: true, podcast_guid: true } },
      [GUID_A]
    );
    expect(provider.resolveFeedsByGuid).not.toHaveBeenCalled();
    expect(provider.resolveItem).not.toHaveBeenCalled();
    expect(result.outcomes).toEqual([{ status: 'parsed' }]);
  });

  it('treats a found feed whose provider id is already parsed as parsed', async () => {
    provider.resolveFeedsByGuid.mockResolvedValue({
      status: 'found',
      value: new Map([[GUID_A, providerFeed()]]),
    });
    feedGetByPodcastIndexIdMock.mockResolvedValue({ id: 8, podcast_index_id: 1001 });

    const result = await resolveRemoteStubsForRefs(
      provider,
      [{ feedGuid: GUID_A, feedUrl: null, itemGuid: 'episode-1' }],
      options
    );

    expect(feedGetByPodcastIndexIdMock).toHaveBeenCalledWith(1001);
    expect(upsertChannelStubMock).not.toHaveBeenCalled();
    expect(provider.resolveItem).not.toHaveBeenCalled();
    expect(result.outcomes).toEqual([{ status: 'parsed' }]);
  });

  it('reuses a fresh stub without a provider call', async () => {
    const fresh = channelStub({ resolved_at: new Date(Date.now() - DAY_MS) });
    getChannelStubsForRefsMock.mockResolvedValue([fresh]);

    const result = await resolveRemoteStubsForRefs(
      provider,
      [{ feedGuid: GUID_A, feedUrl: URL_A, itemGuid: null }],
      options
    );

    expect(getChannelStubsForRefsMock).toHaveBeenCalledWith([{ feedGuid: GUID_A, feedUrl: URL_A }]);
    expect(provider.resolveFeedsByGuid).not.toHaveBeenCalled();
    expect(provider.resolveFeed).not.toHaveBeenCalled();
    expect(upsertChannelStubMock).not.toHaveBeenCalled();
    expect(result.outcomes).toEqual([{ status: 'stub', channelStub: fresh }]);
  });

  it('re-resolves a stale stub through the batch and upserts it', async () => {
    const stale = channelStub({ resolved_at: new Date(Date.now() - 30 * DAY_MS) });
    getChannelStubsForRefsMock.mockResolvedValue([stale]);
    const feed = providerFeed({ title: 'Renamed Show' });
    provider.resolveFeedsByGuid.mockResolvedValue({
      status: 'found',
      value: new Map([[GUID_A, feed]]),
    });

    const result = await resolveRemoteStubsForRefs(
      provider,
      [{ feedGuid: GUID_A, feedUrl: null, itemGuid: null }],
      options
    );

    expect(provider.resolveFeedsByGuid).toHaveBeenCalledWith([GUID_A]);
    expect(upsertChannelStubMock).toHaveBeenCalledWith(feed, [{ feedGuid: GUID_A, feedUrl: null }]);
    expect(result.channelStubsWritten).toBe(1);
  });

  it('skips a feed the provider reports dead', async () => {
    provider.resolveFeedsByGuid.mockResolvedValue({
      status: 'found',
      value: new Map([[GUID_A, providerFeed({ isDead: true })]]),
    });

    const result = await resolveRemoteStubsForRefs(
      provider,
      [{ feedGuid: GUID_A, feedUrl: null, itemGuid: null }],
      options
    );

    expect(upsertChannelStubMock).not.toHaveBeenCalled();
    expect(result.outcomes).toEqual([{ status: 'skipped' }]);
  });

  it('skips an excluded feed GUID and a ref with no usable key', async () => {
    const result = await resolveRemoteStubsForRefs(
      provider,
      [
        { feedGuid: GUID_SELF.toUpperCase(), feedUrl: null, itemGuid: null },
        { feedGuid: 'not-a-guid', feedUrl: '  ', itemGuid: null },
      ],
      { ...options, excludeFeedGuids: [GUID_SELF] }
    );

    expect(provider.resolveFeedsByGuid).not.toHaveBeenCalled();
    expect(provider.resolveFeed).not.toHaveBeenCalled();
    expect(result.outcomes).toEqual([{ status: 'skipped' }, { status: 'skipped' }]);
  });

  it('writes an item stub under its channel stub with the provider feed id', async () => {
    const feed = providerFeed();
    provider.resolveFeedsByGuid.mockResolvedValue({
      status: 'found',
      value: new Map([[GUID_A, feed]]),
    });
    const item = providerItem();
    provider.resolveItem.mockResolvedValue({ status: 'found', value: item });

    const result = await resolveRemoteStubsForRefs(
      provider,
      [{ feedGuid: GUID_A, feedUrl: null, itemGuid: 'episode-1' }],
      options
    );

    expect(getItemStubsForRefsMock).toHaveBeenCalledWith([
      { feedGuid: GUID_A, feedUrl: null, itemGuid: 'episode-1' },
    ]);
    expect(provider.resolveItem).toHaveBeenCalledWith({
      providerFeedId: '1001',
      feedGuid: GUID_A,
      itemGuid: 'episode-1',
    });
    expect(upsertItemStubMock).toHaveBeenCalledWith(
      expect.objectContaining({ provider_feed_id: '1001' }),
      item
    );
    expect(result.itemStubsWritten).toBe(1);
  });

  it('keeps the channel stub when the item is not found', async () => {
    provider.resolveFeedsByGuid.mockResolvedValue({
      status: 'found',
      value: new Map([[GUID_A, providerFeed()]]),
    });

    const result = await resolveRemoteStubsForRefs(
      provider,
      [{ feedGuid: GUID_A, feedUrl: null, itemGuid: 'missing-episode' }],
      options
    );

    expect(provider.resolveItem).toHaveBeenCalledTimes(1);
    expect(upsertItemStubMock).not.toHaveBeenCalled();
    expect(upsertChannelStubMock).toHaveBeenCalledTimes(1);
    expect(result.outcomes[0]?.status).toBe('stub');
    expect(result.itemStubsWritten).toBe(0);
  });

  it('skips the item lookup when a fresh item stub exists', async () => {
    const fresh = channelStub();
    getChannelStubsForRefsMock.mockResolvedValue([fresh]);
    getItemStubsForRefsMock.mockResolvedValue([itemStub(fresh)]);

    await resolveRemoteStubsForRefs(
      provider,
      [{ feedGuid: GUID_A, feedUrl: null, itemGuid: 'episode-1' }],
      options
    );

    expect(provider.resolveItem).not.toHaveBeenCalled();
    expect(upsertItemStubMock).not.toHaveBeenCalled();
  });

  it('looks a feed up once and upserts one stub for two refs to the same GUID', async () => {
    const feed = providerFeed();
    provider.resolveFeedsByGuid.mockResolvedValue({
      status: 'found',
      value: new Map([[GUID_A, feed]]),
    });

    const result = await resolveRemoteStubsForRefs(
      provider,
      [
        { feedGuid: GUID_A, feedUrl: URL_A, itemGuid: null },
        { feedGuid: GUID_A.toUpperCase(), feedUrl: null, itemGuid: null },
      ],
      options
    );

    expect(provider.resolveFeedsByGuid).toHaveBeenCalledWith([GUID_A]);
    expect(upsertChannelStubMock).toHaveBeenCalledTimes(1);
    expect(upsertChannelStubMock).toHaveBeenCalledWith(feed, [
      { feedGuid: GUID_A, feedUrl: URL_A },
    ]);
    expect(result.outcomes.map((outcome) => outcome.status)).toEqual(['stub', 'stub']);
  });

  it('marks refs past the single-lookup cap unavailable', async () => {
    const result = await resolveRemoteStubsForRefs(
      provider,
      [
        { feedGuid: null, feedUrl: URL_A, itemGuid: null },
        { feedGuid: null, feedUrl: URL_B, itemGuid: null },
      ],
      { ...options, maxSingleLookups: 1 }
    );

    expect(provider.resolveFeed).toHaveBeenCalledTimes(1);
    expect(sleepMock).not.toHaveBeenCalled();
    expect(result.outcomes).toEqual([{ status: 'not_found' }, { status: 'unavailable' }]);
    expect(result.lookupCapReached).toBe(true);
  });

  it('pauses before every single-key call after the first', async () => {
    const result = await resolveRemoteStubsForRefs(
      provider,
      [
        { feedGuid: null, feedUrl: URL_A, itemGuid: null },
        { feedGuid: null, feedUrl: URL_B, itemGuid: null },
      ],
      { ...options, maxSingleLookups: 2 }
    );

    expect(provider.resolveFeed).toHaveBeenCalledTimes(2);
    expect(sleepMock).toHaveBeenCalledTimes(1);
    expect(sleepMock).toHaveBeenCalledWith(250);
    expect(result.lookupCapReached).toBe(false);
  });

  it('treats a URL-only ref whose feed URL is parsed as parsed', async () => {
    feedGetByUrlMock.mockResolvedValue({ id: 4, url: URL_A });

    const result = await resolveRemoteStubsForRefs(
      provider,
      [{ feedGuid: null, feedUrl: URL_A, itemGuid: null }],
      options
    );

    expect(feedGetByUrlMock).toHaveBeenCalledWith({ url: URL_A });
    expect(provider.resolveFeed).not.toHaveBeenCalled();
    expect(result.outcomes).toEqual([{ status: 'parsed' }]);
  });

  it('writes nothing but channel and item stub upserts', async () => {
    provider.resolveFeedsByGuid.mockResolvedValue({
      status: 'found',
      value: new Map([[GUID_A, providerFeed()]]),
    });
    provider.resolveItem.mockResolvedValue({ status: 'found', value: providerItem() });

    await resolveRemoteStubsForRefs(
      provider,
      [{ feedGuid: GUID_A, feedUrl: URL_A, itemGuid: 'episode-1' }],
      options
    );

    expect(upsertChannelStubMock).toHaveBeenCalledTimes(1);
    expect(upsertItemStubMock).toHaveBeenCalledTimes(1);
    expect(deleteForParsedFeedMock).not.toHaveBeenCalled();
    expect(channelGetMock).not.toHaveBeenCalled();
  });
});

describe('resolveRemoteItemStubsForChannel', () => {
  const sourceChannel = { id: 5 } as Channel;

  it('reads nothing when there is no index provider', async () => {
    getOptionalIndexProviderMock.mockReturnValue(null);

    await resolveRemoteItemStubsForChannel(sourceChannel);

    expect(channelGetMock).not.toHaveBeenCalled();
    expect(collectRemoteItemRefsMock).not.toHaveBeenCalled();
    expect(getChannelStubsForRefsMock).not.toHaveBeenCalled();
  });

  it("excludes the channel's own GUID and logs a summary", async () => {
    getOptionalIndexProviderMock.mockReturnValue(provider);
    channelGetMock.mockResolvedValue({ id: 5, podcast_guid: GUID_SELF });
    collectRemoteItemRefsMock.mockResolvedValue([
      { source: 'podroll', feedGuid: GUID_SELF, feedUrl: null, itemGuid: null },
      { source: 'podroll', feedGuid: GUID_A, feedUrl: null, itemGuid: null },
    ]);

    await resolveRemoteItemStubsForChannel(sourceChannel);

    expect(channelGetMock).toHaveBeenCalledWith(5);
    expect(provider.resolveFeedsByGuid).toHaveBeenCalledWith([GUID_A]);
    expect(infoMock).toHaveBeenCalledWith(expect.stringContaining('refs=2'));
    expect(infoMock).toHaveBeenCalledWith(expect.stringContaining('skipped=1'));
    expect(REMOTE_STUB_MAX_SINGLE_LOOKUPS_PER_RUN).toBe(100);
    expect(REMOTE_STUB_REFRESH_AFTER_MS).toBe(7 * DAY_MS);
  });

  it('logs a thrown ORM error instead of rethrowing it', async () => {
    getOptionalIndexProviderMock.mockReturnValue(provider);
    const error = new Error('database down');
    channelGetMock.mockRejectedValue(error);

    await expect(resolveRemoteItemStubsForChannel(sourceChannel)).resolves.toBeUndefined();
    expect(logErrorMock).toHaveBeenCalledWith('resolveRemoteItemStubsForChannel', error);
  });
});

describe('deleteRemoteStubsForParsedFeed', () => {
  const parsedFeed = { id: 3, podcast_index_id: 9001, url: URL_A } as Feed;

  it('deletes by provider id, the saved channel GUID, and the feed URL', async () => {
    channelGetMock.mockResolvedValue({ id: 5, podcast_guid: GUID_A });
    deleteForParsedFeedMock.mockResolvedValue(2);

    await deleteRemoteStubsForParsedFeed(parsedFeed, 5);

    expect(channelGetMock).toHaveBeenCalledWith(5);
    expect(deleteForParsedFeedMock).toHaveBeenCalledWith({
      podcastIndexId: 9001,
      podcastGuid: GUID_A,
      feedUrl: URL_A,
    });
    expect(infoMock).toHaveBeenCalledTimes(1);
  });

  it('logs a thrown error instead of rethrowing it', async () => {
    channelGetMock.mockResolvedValue(null);
    const error = new Error('delete failed');
    deleteForParsedFeedMock.mockRejectedValue(error);

    await expect(deleteRemoteStubsForParsedFeed(parsedFeed, 5)).resolves.toBeUndefined();
    expect(deleteForParsedFeedMock).toHaveBeenCalledWith({
      podcastIndexId: 9001,
      podcastGuid: null,
      feedUrl: URL_A,
    });
    expect(logErrorMock).toHaveBeenCalledWith('deleteRemoteStubsForParsedFeed', error);
  });
});
