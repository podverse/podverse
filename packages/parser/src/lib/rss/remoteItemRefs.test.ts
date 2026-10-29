import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  podrollGetMock,
  podrollRemoteItemsGetAllMock,
  publisherGetMock,
  publisherRemoteItemsGetAllMock,
  channelRemoteItemsGetAllMock,
  itemGetManyByChannelMock,
} = vi.hoisted(() => ({
  podrollGetMock: vi.fn(),
  podrollRemoteItemsGetAllMock: vi.fn(),
  publisherGetMock: vi.fn(),
  publisherRemoteItemsGetAllMock: vi.fn(),
  channelRemoteItemsGetAllMock: vi.fn(),
  itemGetManyByChannelMock: vi.fn(),
}));

vi.mock('@podverse/orm', () => ({
  ChannelPodrollService: class ChannelPodrollService {
    get = podrollGetMock;
  },
  ChannelPodrollRemoteItemService: class ChannelPodrollRemoteItemService {
    getAll = podrollRemoteItemsGetAllMock;
  },
  ChannelPublisherService: class ChannelPublisherService {
    get = publisherGetMock;
  },
  ChannelPublisherRemoteItemService: class ChannelPublisherRemoteItemService {
    getAll = publisherRemoteItemsGetAllMock;
  },
  ChannelRemoteItemService: class ChannelRemoteItemService {
    getAll = channelRemoteItemsGetAllMock;
  },
  ItemService: class ItemService {
    getManyByChannel = itemGetManyByChannelMock;
  },
}));

import type { Channel } from '@podverse/orm';

import { collectRemoteItemRefs } from './remoteItemRefs.js';

const GUID_PODROLL = '11111111-1111-4111-8111-111111111111';
const GUID_PUBLISHER = '22222222-2222-4222-8222-222222222222';
const GUID_CHANNEL = '33333333-3333-4333-8333-333333333333';
const GUID_SPLIT = '44444444-4444-4444-8444-444444444444';

/** The collector reads id and has_value_time_splits. */
function makeChannel(hasValueTimeSplits: boolean): Channel {
  return { id: 5, has_value_time_splits: hasValueTimeSplits } as Channel;
}

describe('collectRemoteItemRefs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    podrollGetMock.mockResolvedValue({ id: 10 });
    podrollRemoteItemsGetAllMock.mockResolvedValue([
      { feed_guid: GUID_PODROLL, feed_url: null, item_guid: null },
    ]);
    publisherGetMock.mockResolvedValue({ id: 20 });
    publisherRemoteItemsGetAllMock.mockResolvedValue([
      {
        feed_guid: GUID_PUBLISHER,
        feed_url: 'https://publisher.example.com/feed',
        item_guid: null,
      },
    ]);
    channelRemoteItemsGetAllMock.mockResolvedValue([
      { feed_guid: GUID_CHANNEL, feed_url: null, item_guid: 'episode-1' },
    ]);
    itemGetManyByChannelMock.mockResolvedValue([
      {
        item_values: [
          {
            item_value_time_splits: [
              { item_value_time_split_remote_item: null },
              {
                item_value_time_split_remote_item: {
                  feed_guid: GUID_SPLIT,
                  feed_url: 'https://split.example.com/feed',
                  item_guid: 'split-item',
                },
              },
            ],
          },
        ],
      },
    ]);
  });

  it('collects podroll, publisher, channel remote item, and value time split refs in order', async () => {
    const refs = await collectRemoteItemRefs(makeChannel(true));

    expect(refs).toEqual([
      { source: 'podroll', feedGuid: GUID_PODROLL, feedUrl: null, itemGuid: null },
      {
        source: 'publisher',
        feedGuid: GUID_PUBLISHER,
        feedUrl: 'https://publisher.example.com/feed',
        itemGuid: null,
      },
      {
        source: 'channel_remote_item',
        feedGuid: GUID_CHANNEL,
        feedUrl: null,
        itemGuid: 'episode-1',
      },
      {
        source: 'value_time_split',
        feedGuid: GUID_SPLIT,
        feedUrl: 'https://split.example.com/feed',
        itemGuid: 'split-item',
      },
    ]);
    expect(podrollRemoteItemsGetAllMock).toHaveBeenCalledWith({ id: 10 });
    expect(publisherRemoteItemsGetAllMock).toHaveBeenCalledWith({ id: 20 });
  });

  it('skips the item query without value time splits and publisher refs without a publisher row', async () => {
    publisherGetMock.mockResolvedValue(null);

    const refs = await collectRemoteItemRefs(makeChannel(false));

    expect(itemGetManyByChannelMock).not.toHaveBeenCalled();
    expect(publisherRemoteItemsGetAllMock).not.toHaveBeenCalled();
    expect(refs.map((ref) => ref.source)).toEqual(['podroll', 'channel_remote_item']);
  });
});
