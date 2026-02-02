import type { RemoteItemDto } from '@podverse/helpers';
import { filterInvalidFeedUuids } from '@podverse/helpers';
import type { EntityManager } from 'typeorm';
import type { ChannelPodroll } from '@orm/entities/channel/channelPodroll.js';
import { ChannelPodrollRemoteItem } from '@orm/entities/channel/channelPodrollRemoteItem.js';
import { BaseRemoteItemsService } from '@orm/services/base/baseRemoteItemsService.js';

export class ChannelPodrollRemoteItemService extends BaseRemoteItemsService<
  ChannelPodrollRemoteItem,
  'channel_podroll'
> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ChannelPodrollRemoteItem, 'channel_podroll', transactionalEntityManager);
  }

  async getAll(channel_podroll: ChannelPodroll): Promise<ChannelPodrollRemoteItem[]> {
    return super.getAll(channel_podroll);
  }

  async update(
    channel_podroll: ChannelPodroll,
    dto: RemoteItemDto
  ): Promise<ChannelPodrollRemoteItem> {
    return super.update(channel_podroll, dto);
  }

  async updateMany(
    channel_podroll: ChannelPodroll,
    dtos: RemoteItemDto[]
  ): Promise<ChannelPodrollRemoteItem[]> {
    const filteredDtos = filterInvalidFeedUuids(dtos);
    return super.updateMany(channel_podroll, filteredDtos);
  }
}
