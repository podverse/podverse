import { filterInvalidFeedUuids, RemoteItemDto } from '@podverse/helpers';
import { EntityManager } from 'typeorm';
import { ChannelPodroll } from '@orm/entities/channel/channelPodroll';
import { ChannelPodrollRemoteItem } from '@orm/entities/channel/channelPodrollRemoteItem';
import { BaseRemoteItemsService } from '@orm/services/base/baseRemoteItemsService';

export class ChannelPodrollRemoteItemService extends BaseRemoteItemsService<ChannelPodrollRemoteItem, 'channel_podroll'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ChannelPodrollRemoteItem, 'channel_podroll', transactionalEntityManager);
  }

  async getAll(channel_podroll: ChannelPodroll): Promise<ChannelPodrollRemoteItem[]> {
    return super.getAll(channel_podroll);
  }

  async update(channel_podroll: ChannelPodroll, dto: RemoteItemDto): Promise<ChannelPodrollRemoteItem> {
    return super.update(channel_podroll, dto);
  }

  async updateMany(channel_podroll: ChannelPodroll, dtos: RemoteItemDto[]): Promise<ChannelPodrollRemoteItem[]> { 
    const filteredDtos = filterInvalidFeedUuids(dtos);
    return super.updateMany(channel_podroll, filteredDtos);
  }
}
