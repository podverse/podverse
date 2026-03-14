import type { Channel } from '@orm/entities/channel/channel.js';
import { ChannelRemoteItem } from '@orm/entities/channel/channelRemoteItem.js';
import { BaseRemoteItemsService } from '@orm/services/base/baseRemoteItemsService.js';
import type { EntityManager } from 'typeorm';

import type { RemoteItemDto } from '@podverse/helpers';
import { filterInvalidFeedUuids } from '@podverse/helpers';

export class ChannelRemoteItemService extends BaseRemoteItemsService<ChannelRemoteItem, 'channel'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ChannelRemoteItem, 'channel', transactionalEntityManager);
  }

  async getAll(channel: Channel): Promise<ChannelRemoteItem[]> {
    return super.getAll(channel);
  }

  async update(channel: Channel, dto: RemoteItemDto): Promise<ChannelRemoteItem> {
    return super.update(channel, dto);
  }

  async updateMany(channel: Channel, dtos: RemoteItemDto[]): Promise<ChannelRemoteItem[]> {
    const filteredDtos = filterInvalidFeedUuids(dtos);
    return super.updateMany(channel, filteredDtos);
  }

  async deleteAll(channel: Channel): Promise<void> {
    return super._deleteAll(channel);
  }
}
