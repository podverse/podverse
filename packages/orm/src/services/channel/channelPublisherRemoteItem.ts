import { filterInvalidFeedUuids, RemoteItemDto } from '@podverse/helpers';
import { EntityManager } from 'typeorm';
import { ChannelPublisher } from '@orm/entities/channel/channelPublisher';
import { ChannelPublisherRemoteItem } from '@orm/entities/channel/channelPublisherRemoteItem';
import { BaseRemoteItemsService } from '@orm/services/base/baseRemoteItemsService';

export class ChannelPublisherRemoteItemService extends BaseRemoteItemsService<
  ChannelPublisherRemoteItem,
  'channel_publisher'
> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ChannelPublisherRemoteItem, 'channel_publisher', transactionalEntityManager);
  }

  async getAll(channel_podroll: ChannelPublisher): Promise<ChannelPublisherRemoteItem[]> {
    return super.getAll(channel_podroll);
  }

  async update(
    channel_publisher: ChannelPublisher,
    dto: RemoteItemDto
  ): Promise<ChannelPublisherRemoteItem> {
    return super.update(channel_publisher, dto);
  }

  async updateMany(
    channel_publisher: ChannelPublisher,
    dtos: RemoteItemDto[]
  ): Promise<ChannelPublisherRemoteItem[]> {
    const filteredDtos = filterInvalidFeedUuids(dtos);
    return super.updateMany(channel_publisher, filteredDtos);
  }
}
