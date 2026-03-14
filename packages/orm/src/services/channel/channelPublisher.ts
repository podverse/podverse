import type { Channel } from '@orm/entities/channel/channel.js';
import { ChannelPublisher } from '@orm/entities/channel/channelPublisher.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';
import type { EntityManager } from 'typeorm';

type ChannelPublisherDto = object;

export class ChannelPublisherService extends BaseOneService<ChannelPublisher, 'channel'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ChannelPublisher, 'channel', transactionalEntityManager);
  }

  async get(channel: Channel): Promise<ChannelPublisher | null> {
    return super._get(channel);
  }

  async update(channel: Channel, dto: ChannelPublisherDto): Promise<ChannelPublisher> {
    return super._update(channel, dto);
  }

  async delete(channel: Channel): Promise<void> {
    return super._delete(channel);
  }
}
