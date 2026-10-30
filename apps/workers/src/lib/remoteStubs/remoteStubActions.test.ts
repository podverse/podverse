import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IndexProvider, IndexProviderFeed, IndexProviderLookup } from '@podverse/helpers';

const {
  deleteByIdMock,
  getByIdWithRelationsMock,
  getByPodcastIndexIdMock,
  repointToFeedMock,
  resolveRemoteStubsForRefsMock,
  upsertChannelStubMock,
} = vi.hoisted(() => ({
  deleteByIdMock: vi.fn(async (_id: number): Promise<boolean> => true),
  getByIdWithRelationsMock: vi.fn(async (_id: number): Promise<unknown> => null),
  getByPodcastIndexIdMock: vi.fn(async (_id: number): Promise<unknown> => null),
  repointToFeedMock: vi.fn(async (_id: number, _feed: unknown): Promise<unknown> => ({})),
  resolveRemoteStubsForRefsMock: vi.fn(
    async (
      _provider: IndexProvider,
      _refs: readonly {
        feedGuid: string | null;
        feedUrl: string | null;
        itemGuid: string | null;
      }[],
      _options: {
        rateLimitDelayMs: number;
        maxSingleLookups: number;
        refreshAfterMs: number;
      }
    ): Promise<{ outcomes: { status: string; channelStub?: { id: number } }[] }> => ({
      outcomes: [],
    })
  ),
  upsertChannelStubMock: vi.fn(async (_feed: unknown, _refs: unknown): Promise<unknown> => ({})),
}));

vi.mock('@podverse/orm', () => ({
  FeedService: class MockFeedService {
    getByPodcastIndexId = getByPodcastIndexIdMock;
  },
  RemoteChannelStubService: class MockRemoteChannelStubService {
    deleteById = deleteByIdMock;
    getByIdWithRelations = getByIdWithRelationsMock;
    repointToFeed = repointToFeedMock;
    upsertChannelStub = upsertChannelStubMock;
  },
}));

vi.mock('@podverse/parser', () => ({
  resolveRemoteStubsForRefs: resolveRemoteStubsForRefsMock,
}));

import {
  recheckRemoteChannelStub,
  REMOTE_STUB_RECHECK_MAX_SINGLE_LOOKUPS,
  repointRemoteChannelStub,
} from './remoteStubActions.js';

type StubWithRelations = {
  id: number;
  provider_feed_id: string;
  resolved_at: Date;
  aliases: { key_kind: 'feed_guid' | 'feed_url'; key_value: string }[];
  item_stubs: { item_guid: string }[];
};

const GUID_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const URL_A = 'https://example.com/feed.xml';

function stubWithRelations(overrides: Partial<StubWithRelations> = {}): StubWithRelations {
  return {
    id: 88,
    provider_feed_id: '9001',
    resolved_at: new Date('2026-01-01T00:00:00.000Z'),
    aliases: [{ key_kind: 'feed_guid', key_value: GUID_A }],
    item_stubs: [],
    ...overrides,
  };
}

function providerFeed(overrides: Partial<IndexProviderFeed> = {}): IndexProviderFeed {
  return {
    indexProvider: 'podcast_index',
    providerFeedId: '9001',
    feedGuid: GUID_A,
    feedUrl: URL_A,
    title: 'Remote show',
    author: null,
    description: null,
    imageUrl: null,
    medium: 'podcast',
    isDead: false,
    ...overrides,
  };
}

function createProvider() {
  const getFeedById = vi.fn(
    async (_providerFeedId: string): Promise<IndexProviderLookup<IndexProviderFeed>> => ({
      status: 'not_found',
    })
  );
  const neverUsed = async (): Promise<never> => {
    throw new Error('not used in remoteStubActions tests');
  };
  const provider: IndexProvider = {
    id: 'podcast_index',
    getFeedById,
    resolveFeed: neverUsed,
    resolveFeedsByGuid: neverUsed,
    resolveItem: neverUsed,
  };
  return { provider, getFeedById };
}

describe('recheckRemoteChannelStub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveRemoteStubsForRefsMock.mockResolvedValue({ outcomes: [] });
    getByPodcastIndexIdMock.mockResolvedValue(null);
  });

  it('returns missing when the stub does not exist', async () => {
    getByIdWithRelationsMock.mockResolvedValue(null);
    const { provider } = createProvider();

    const result = await recheckRemoteChannelStub(provider, 88, { rateLimitDelayMs: 150 });

    expect(result).toBe('missing');
    expect(resolveRemoteStubsForRefsMock).not.toHaveBeenCalled();
  });

  it('returns repointed when the reload after resolver write is gone', async () => {
    const stub = stubWithRelations();
    getByIdWithRelationsMock.mockResolvedValueOnce(stub).mockResolvedValueOnce(null);
    resolveRemoteStubsForRefsMock.mockResolvedValue({ outcomes: [{ status: 'not_found' }] });
    const { provider } = createProvider();

    const result = await recheckRemoteChannelStub(provider, stub.id, { rateLimitDelayMs: 150 });

    expect(result).toBe('repointed');
  });

  it('returns refreshed when the resolver refreshed this stub', async () => {
    const initial = stubWithRelations();
    const refreshed = stubWithRelations({ resolved_at: new Date(Date.now() + 1000) });
    getByIdWithRelationsMock.mockResolvedValueOnce(initial).mockResolvedValueOnce(refreshed);
    resolveRemoteStubsForRefsMock.mockResolvedValue({ outcomes: [{ status: 'not_found' }] });
    const { provider, getFeedById } = createProvider();

    const result = await recheckRemoteChannelStub(provider, initial.id, { rateLimitDelayMs: 150 });

    expect(result).toBe('refreshed');
    expect(deleteByIdMock).not.toHaveBeenCalled();
    expect(getFeedById).not.toHaveBeenCalled();
  });

  it('returns unavailable for mixed stale-stub and unavailable outcomes without deleting', async () => {
    const stub = stubWithRelations();
    getByIdWithRelationsMock.mockResolvedValueOnce(stub).mockResolvedValueOnce(stub);
    resolveRemoteStubsForRefsMock.mockResolvedValue({
      outcomes: [{ status: 'stub', channelStub: { id: 999 } }, { status: 'unavailable' }],
    });
    const { provider } = createProvider();

    const result = await recheckRemoteChannelStub(provider, stub.id, { rateLimitDelayMs: 150 });

    expect(result).toBe('unavailable');
    expect(deleteByIdMock).not.toHaveBeenCalled();
  });

  it('deletes and returns repointed when outcomes point to another stub', async () => {
    const stub = stubWithRelations();
    getByIdWithRelationsMock.mockResolvedValueOnce(stub).mockResolvedValueOnce(stub);
    resolveRemoteStubsForRefsMock.mockResolvedValue({
      outcomes: [{ status: 'stub', channelStub: { id: 999 } }],
    });
    const { provider } = createProvider();

    const result = await recheckRemoteChannelStub(provider, stub.id, { rateLimitDelayMs: 150 });

    expect(result).toBe('repointed');
    expect(deleteByIdMock).toHaveBeenCalledWith(stub.id);
  });

  it('deletes and returns deleted_parsed when outcomes report parsed', async () => {
    const stub = stubWithRelations();
    getByIdWithRelationsMock.mockResolvedValueOnce(stub).mockResolvedValueOnce(stub);
    resolveRemoteStubsForRefsMock.mockResolvedValue({ outcomes: [{ status: 'parsed' }] });
    const { provider } = createProvider();

    const result = await recheckRemoteChannelStub(provider, stub.id, { rateLimitDelayMs: 150 });

    expect(result).toBe('deleted_parsed');
    expect(deleteByIdMock).toHaveBeenCalledWith(stub.id);
  });

  it('refreshes the stub when only not_found outcomes exist and provider feed still exists', async () => {
    const stub = stubWithRelations({ aliases: [] });
    getByIdWithRelationsMock.mockResolvedValueOnce(stub);
    const { provider, getFeedById } = createProvider();
    const feed = providerFeed();
    getFeedById.mockResolvedValue({ status: 'found', value: feed });

    const result = await recheckRemoteChannelStub(provider, stub.id, { rateLimitDelayMs: 150 });

    expect(result).toBe('refreshed');
    expect(upsertChannelStubMock).toHaveBeenCalledWith(feed, []);
  });

  it('deletes and returns deleted_not_found when provider no longer has the feed', async () => {
    const stub = stubWithRelations({ aliases: [] });
    getByIdWithRelationsMock.mockResolvedValueOnce(stub);
    const { provider } = createProvider();

    const result = await recheckRemoteChannelStub(provider, stub.id, { rateLimitDelayMs: 150 });

    expect(result).toBe('deleted_not_found');
    expect(deleteByIdMock).toHaveBeenCalledWith(stub.id);
  });

  it('deletes and returns deleted_retired when provider marks the feed dead', async () => {
    const stub = stubWithRelations({ aliases: [] });
    getByIdWithRelationsMock.mockResolvedValueOnce(stub);
    const { provider, getFeedById } = createProvider();
    getFeedById.mockResolvedValue({ status: 'found', value: providerFeed({ isDead: true }) });

    const result = await recheckRemoteChannelStub(provider, stub.id, { rateLimitDelayMs: 150 });

    expect(result).toBe('deleted_retired');
    expect(deleteByIdMock).toHaveBeenCalledWith(stub.id);
  });

  it('deletes and returns deleted_parsed when provider feed is already parsed', async () => {
    const stub = stubWithRelations({ aliases: [] });
    getByIdWithRelationsMock.mockResolvedValueOnce(stub);
    getByPodcastIndexIdMock.mockResolvedValue({ id: 10 });
    const { provider, getFeedById } = createProvider();
    getFeedById.mockResolvedValue({ status: 'found', value: providerFeed() });

    const result = await recheckRemoteChannelStub(provider, stub.id, { rateLimitDelayMs: 150 });

    expect(result).toBe('deleted_parsed');
    expect(deleteByIdMock).toHaveBeenCalledWith(stub.id);
  });

  it('calls the resolver with refreshAfterMs zero, lookup cap, and item refs keyed by GUID alias', async () => {
    const stub = stubWithRelations({
      aliases: [
        { key_kind: 'feed_url', key_value: URL_A },
        { key_kind: 'feed_guid', key_value: GUID_A },
      ],
      item_stubs: [{ item_guid: 'episode-1' }],
    });
    getByIdWithRelationsMock.mockResolvedValueOnce(stub).mockResolvedValueOnce(stub);
    resolveRemoteStubsForRefsMock.mockResolvedValue({ outcomes: [{ status: 'not_found' }] });
    const { provider, getFeedById } = createProvider();
    getFeedById.mockResolvedValue({ status: 'found', value: providerFeed() });

    await recheckRemoteChannelStub(provider, stub.id, { rateLimitDelayMs: 321 });

    const call = resolveRemoteStubsForRefsMock.mock.calls[0];
    expect(call).toBeDefined();
    if (call === undefined) {
      throw new Error('resolveRemoteStubsForRefs was not called');
    }
    const [providerArg, refsArg, optionsArg] = call;
    expect(providerArg).toBe(provider);
    expect(refsArg).toEqual(
      expect.arrayContaining([
        { feedGuid: GUID_A, feedUrl: null, itemGuid: null },
        { feedGuid: null, feedUrl: URL_A, itemGuid: null },
        { feedGuid: GUID_A, feedUrl: null, itemGuid: 'episode-1' },
      ])
    );
    expect(optionsArg).toEqual({
      rateLimitDelayMs: 321,
      maxSingleLookups: REMOTE_STUB_RECHECK_MAX_SINGLE_LOOKUPS,
      refreshAfterMs: 0,
    });
  });
});

describe('repointRemoteChannelStub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getByPodcastIndexIdMock.mockResolvedValue(null);
    repointToFeedMock.mockResolvedValue({ id: 111 });
  });

  it('returns missing when the source stub is gone', async () => {
    getByIdWithRelationsMock.mockResolvedValue(null);
    const { provider } = createProvider();

    const result = await repointRemoteChannelStub(provider, 88, '9002');

    expect(result).toBe('missing');
  });

  it('returns unavailable when the provider lookup is unavailable', async () => {
    const stub = stubWithRelations();
    getByIdWithRelationsMock.mockResolvedValue(stub);
    const { provider, getFeedById } = createProvider();
    getFeedById.mockResolvedValue({ status: 'unavailable' });

    const result = await repointRemoteChannelStub(provider, stub.id, '9002');

    expect(result).toBe('unavailable');
  });

  it('returns target_not_found for missing or dead targets without writes', async () => {
    const stub = stubWithRelations();
    getByIdWithRelationsMock.mockResolvedValue(stub);

    const missingTarget = createProvider();
    const missingResult = await repointRemoteChannelStub(missingTarget.provider, stub.id, '9002');
    expect(missingResult).toBe('target_not_found');

    const deadTarget = createProvider();
    deadTarget.getFeedById.mockResolvedValue({
      status: 'found',
      value: providerFeed({ providerFeedId: '9002', isDead: true }),
    });
    const deadResult = await repointRemoteChannelStub(deadTarget.provider, stub.id, '9002');
    expect(deadResult).toBe('target_not_found');

    expect(repointToFeedMock).not.toHaveBeenCalled();
    expect(deleteByIdMock).not.toHaveBeenCalled();
  });

  it('deletes and returns deleted_parsed when target feed is already parsed', async () => {
    const stub = stubWithRelations();
    getByIdWithRelationsMock.mockResolvedValue(stub);
    getByPodcastIndexIdMock.mockResolvedValue({ id: 10 });
    const { provider, getFeedById } = createProvider();
    getFeedById.mockResolvedValue({
      status: 'found',
      value: providerFeed({ providerFeedId: '9002' }),
    });

    const result = await repointRemoteChannelStub(provider, stub.id, '9002');

    expect(result).toBe('deleted_parsed');
    expect(deleteByIdMock).toHaveBeenCalledWith(stub.id);
    expect(repointToFeedMock).not.toHaveBeenCalled();
  });

  it('repoints when target feed is available and unparsed', async () => {
    const stub = stubWithRelations();
    getByIdWithRelationsMock.mockResolvedValue(stub);
    repointToFeedMock.mockResolvedValue({ id: 333 });
    const { provider, getFeedById } = createProvider();
    const targetFeed = providerFeed({ providerFeedId: '9002' });
    getFeedById.mockResolvedValue({ status: 'found', value: targetFeed });

    const result = await repointRemoteChannelStub(provider, stub.id, '9002');

    expect(result).toBe('repointed');
    expect(repointToFeedMock).toHaveBeenCalledWith(stub.id, targetFeed);
  });
});
