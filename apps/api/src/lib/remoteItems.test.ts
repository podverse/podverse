import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RemoteItemGeneric } from '@podverse/helpers';

type StubChannel = {
  id: number;
  index_provider: 'podcast_index';
  provider_feed_id: string;
  feed_guid: string | null;
  feed_url: string;
  title: string | null;
  author: string | null;
  image_url: string | null;
  medium_id: number | null;
};

type StubItem = {
  id: number;
  item_guid: string;
  provider_item_id: string | null;
  title: string | null;
  image_url: string | null;
  pub_date: Date | null;
  duration_seconds: number | null;
  remote_channel_stub: StubChannel;
};

const channelStubLookupMock = vi.hoisted(() => vi.fn());
const itemStubLookupMock = vi.hoisted(() => vi.fn());
const podcastIndexMocks = vi.hoisted(() => {
  const throwOnCall = async (): Promise<never> => {
    throw new Error('Podcast Index must not be called by buildRemoteItemsFinalResult');
  };
  return {
    podcastsBatchByFeedGuid: vi.fn(throwOnCall),
    podcastGetByFeedUrl: vi.fn(throwOnCall),
    episodeGetByGuid: vi.fn(throwOnCall),
  };
});

vi.mock('../factories/podcastIndexService.js', () => ({
  podcastIndexService: podcastIndexMocks,
}));

vi.mock('@podverse/orm', () => ({
  RemoteChannelStubService: class {
    getChannelStubsForRefs = channelStubLookupMock;
  },
  RemoteItemStubService: class {
    getItemStubsForRefs = itemStubLookupMock;
  },
  toDTORemoteChannelStub: (stub: StubChannel) => ({
    is_remote_stub: true,
    index_provider: stub.index_provider,
    provider_feed_id: stub.provider_feed_id,
    feed_guid: stub.feed_guid,
    feed_url: stub.feed_url,
    title: stub.title,
    author: stub.author,
    image_url: stub.image_url,
    medium_id: stub.medium_id,
  }),
  toDTORemoteItemStub: (stub: StubItem, channelStub: StubChannel) => ({
    is_remote_stub: true,
    item_guid: stub.item_guid,
    provider_item_id: stub.provider_item_id,
    title: stub.title,
    image_url: stub.image_url,
    pub_date: stub.pub_date ? stub.pub_date.toISOString() : null,
    duration_seconds: stub.duration_seconds,
    channel_stub: {
      is_remote_stub: true,
      index_provider: channelStub.index_provider,
      provider_feed_id: channelStub.provider_feed_id,
      feed_guid: channelStub.feed_guid,
      feed_url: channelStub.feed_url,
      title: channelStub.title,
      author: channelStub.author,
      image_url: channelStub.image_url,
      medium_id: channelStub.medium_id,
    },
  }),
}));

import { buildRemoteItemsFinalResult } from './remoteItems.js';

function remoteRef(
  feedGuid: string | null,
  feedUrl: string | null,
  itemGuid: string | null
): RemoteItemGeneric {
  return { feed_guid: feedGuid, feed_url: feedUrl, item_guid: itemGuid };
}

function channelStub(id: number, providerFeedId: string): StubChannel {
  return {
    id,
    index_provider: 'podcast_index',
    provider_feed_id: providerFeedId,
    feed_guid: `11111111-1111-4111-8111-${providerFeedId.padStart(12, '0')}`,
    feed_url: `https://example.com/feed-${providerFeedId}.xml`,
    title: `Stub Channel ${providerFeedId}`,
    author: 'Stub Author',
    image_url: null,
    medium_id: 1,
  };
}

function itemStub(id: number, itemGuid: string, stub: StubChannel): StubItem {
  return {
    id,
    item_guid: itemGuid,
    provider_item_id: String(10_000 + id),
    title: `Stub Item ${itemGuid}`,
    image_url: null,
    pub_date: new Date('2026-03-01T12:00:00.000Z'),
    duration_seconds: 3723,
    remote_channel_stub: stub,
  };
}

describe('buildRemoteItemsFinalResult', () => {
  beforeEach(() => {
    channelStubLookupMock.mockReset();
    itemStubLookupMock.mockReset();
    podcastIndexMocks.podcastsBatchByFeedGuid.mockClear();
    podcastIndexMocks.podcastGetByFeedUrl.mockClear();
    podcastIndexMocks.episodeGetByGuid.mockClear();
  });

  it('returns stubs in ref order and drops null lookups', async () => {
    const channelA = channelStub(1, '900001');
    const channelB = channelStub(2, '900002');
    channelStubLookupMock.mockResolvedValue([channelA, null, channelB]);

    const itemB = itemStub(20, 'item-b', channelB);
    const itemA = itemStub(10, 'item-a', channelA);
    itemStubLookupMock.mockResolvedValue([itemB, null, itemA]);

    const result = await buildRemoteItemsFinalResult({
      channelsAdded: [],
      channelRefsUnmatched: [
        remoteRef(channelA.feed_guid, channelA.feed_url, null),
        remoteRef('missing-guid', 'https://missing.example.com/feed.xml', null),
        remoteRef(channelB.feed_guid, channelB.feed_url, null),
      ],
      itemsAdded: [],
      itemRefsUnmatched: [
        remoteRef(channelB.feed_guid, channelB.feed_url, 'item-b'),
        remoteRef('missing-guid', 'https://missing.example.com/feed.xml', 'item-missing'),
        remoteRef(channelA.feed_guid, channelA.feed_url, 'item-a'),
      ],
    });

    expect(result.channelsUnadded.map((stub) => stub.provider_feed_id)).toEqual([
      '900001',
      '900002',
    ]);
    expect(result.itemsUnadded.map((stub) => stub.item_guid)).toEqual(['item-b', 'item-a']);
    expect(podcastIndexMocks.podcastsBatchByFeedGuid).not.toHaveBeenCalled();
    expect(podcastIndexMocks.podcastGetByFeedUrl).not.toHaveBeenCalled();
    expect(podcastIndexMocks.episodeGetByGuid).not.toHaveBeenCalled();
  });

  it('dedupes repeated channel and item stubs by id', async () => {
    const channelA = channelStub(1, '900001');
    const itemA = itemStub(10, 'item-a', channelA);
    channelStubLookupMock.mockResolvedValue([channelA, channelA]);
    itemStubLookupMock.mockResolvedValue([itemA, itemA]);

    const result = await buildRemoteItemsFinalResult({
      channelsAdded: [],
      channelRefsUnmatched: [
        remoteRef(channelA.feed_guid, channelA.feed_url, null),
        remoteRef(channelA.feed_guid, channelA.feed_url, null),
      ],
      itemsAdded: [],
      itemRefsUnmatched: [
        remoteRef(channelA.feed_guid, channelA.feed_url, 'item-a'),
        remoteRef(channelA.feed_guid, channelA.feed_url, 'item-a'),
      ],
    });

    expect(result.channelsUnadded).toHaveLength(1);
    expect(result.itemsUnadded).toHaveLength(1);
  });

  it('sends only refs with non-empty item_guid to the item stub service', async () => {
    const channelA = channelStub(1, '900001');
    channelStubLookupMock.mockResolvedValue([]);
    itemStubLookupMock.mockResolvedValue([itemStub(10, 'item-a', channelA)]);

    await buildRemoteItemsFinalResult({
      channelsAdded: [],
      channelRefsUnmatched: [],
      itemsAdded: [],
      itemRefsUnmatched: [
        remoteRef(channelA.feed_guid, channelA.feed_url, null),
        remoteRef(channelA.feed_guid, channelA.feed_url, ''),
        remoteRef(channelA.feed_guid, channelA.feed_url, '   '),
        remoteRef(channelA.feed_guid, channelA.feed_url, '  item-a  '),
      ],
    });

    expect(itemStubLookupMock).toHaveBeenCalledTimes(1);
    expect(itemStubLookupMock).toHaveBeenCalledWith([
      {
        feedGuid: channelA.feed_guid,
        feedUrl: channelA.feed_url,
        itemGuid: 'item-a',
      },
    ]);
  });

  it('does not call stub services when unmatched refs are empty', async () => {
    const result = await buildRemoteItemsFinalResult({
      channelsAdded: [],
      channelRefsUnmatched: [],
      itemsAdded: [],
      itemRefsUnmatched: [],
    });

    expect(result.channelsUnadded).toEqual([]);
    expect(result.itemsUnadded).toEqual([]);
    expect(channelStubLookupMock).not.toHaveBeenCalled();
    expect(itemStubLookupMock).not.toHaveBeenCalled();
  });
});
