import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findMock, findOneMock, ChannelPublisherRemoteItemEntity } = vi.hoisted(() => ({
  findMock: vi.fn(() => Promise.resolve([])),
  findOneMock: vi.fn(() => Promise.resolve(null)),
  ChannelPublisherRemoteItemEntity: class ChannelPublisherRemoteItem {},
}));

vi.mock('@orm/context.js', () => ({
  getDataSourceRead: () => ({
    getRepository: () => ({
      find: findMock,
      findOne: findOneMock,
    }),
  }),
  getDataSourceReadWrite: () => ({
    getRepository: () => ({
      find: findMock,
      findOne: findOneMock,
      save: vi.fn(),
    }),
  }),
  getLoggerService: () => ({
    debug: vi.fn(),
  }),
}));

vi.mock('@orm/entities/channel/channelPublisherRemoteItem.js', () => ({
  ChannelPublisherRemoteItem: ChannelPublisherRemoteItemEntity,
}));

import type { ChannelPublisher } from '@orm/entities/channel/channelPublisher.js';
import { ChannelPublisherRemoteItemService } from '@orm/services/channel/channelPublisherRemoteItem.js';

function createPublisherParentFixture(): ChannelPublisher {
  return {
    id: 42,
    channel: {
      id: 99,
      slug: null,
    },
  } as ChannelPublisher;
}

describe('BaseRemoteItemsService parent WHERE', () => {
  beforeEach(() => {
    findMock.mockClear();
    findOneMock.mockClear();
  });

  it('getAll uses parent id only when nested channel has null slug', async () => {
    const service = new ChannelPublisherRemoteItemService();

    await service.getAll(createPublisherParentFixture());

    expect(findMock).toHaveBeenCalledWith({
      where: {
        channel_publisher: { id: 42 },
      },
    });
  });

  it('getByFeedGuid uses parent id only in WHERE', async () => {
    const service = new ChannelPublisherRemoteItemService();
    const feedGuid = '0b214041-5dac-44bb-974a-e61ccf8404762';

    await service.getByFeedGuid(createPublisherParentFixture(), feedGuid);

    expect(findOneMock).toHaveBeenCalledWith({
      where: {
        channel_publisher: { id: 42 },
        feed_guid: feedGuid,
      },
    });
  });
});
