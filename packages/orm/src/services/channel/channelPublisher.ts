import { EntityManager } from 'typeorm';
import { Channel } from '@orm/entities/channel/channel';
import { ChannelPublisher } from '@orm/entities/channel/channelPublisher';
import { BaseOneService } from '@orm/services/base/baseOneService';

type ChannelPublisherDto = object

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
