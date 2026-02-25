import type { RemoteItemDto } from '@podverse/helpers';
import { filterInvalidFeedUuids } from '@podverse/helpers';
import type { EntityManager } from 'typeorm';
import type { ChannelPublisher } from '@orm/entities/channel/channelPublisher.js';
import { ChannelPublisherRemoteItem } from '@orm/entities/channel/channelPublisherRemoteItem.js';
import { BaseRemoteItemsService } from '@orm/services/base/baseRemoteItemsService.js';

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

    // Per RSS spec, publisher can only have ONE remote item.
    // Delete existing before inserting to avoid unique constraint violation.
    const existing = await this.getAll(channel_publisher);
    if (existing.length > 0) {
      await this.repositoryReadWrite.remove(existing);
    }

    // Insert the new one (should be exactly 1 per spec)
    const results: ChannelPublisherRemoteItem[] = [];
    for (const dto of filteredDtos) {
      const entity = await this.update(channel_publisher, dto);
      results.push(entity);
    }
    return results;
  }
}
