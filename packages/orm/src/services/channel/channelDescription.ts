import type { EntityManager } from 'typeorm';
import type { Channel } from '@orm/entities/channel/channel.js';
import { ChannelDescription } from '@orm/entities/channel/channelDescription.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';

type ChannelDescriptionDto = {
  value: string;
};

export class ChannelDescriptionService extends BaseOneService<ChannelDescription, 'channel'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ChannelDescription, 'channel', transactionalEntityManager);
  }

  async update(channel: Channel, dto: ChannelDescriptionDto): Promise<ChannelDescription> {
    return super._update(channel, dto);
  }
}
