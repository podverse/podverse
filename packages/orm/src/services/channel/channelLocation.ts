import type { Channel } from '@orm/entities/channel/channel.js';
import { ChannelLocation } from '@orm/entities/channel/channelLocation.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';
import type { EntityManager } from 'typeorm';

type ChannelLocationDto = {
  geo: string | null;
  osm: string | null;
  name: string | null;
};

export class ChannelLocationService extends BaseOneService<ChannelLocation, 'channel'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ChannelLocation, 'channel', transactionalEntityManager);
  }

  async update(channel: Channel, dto: ChannelLocationDto): Promise<ChannelLocation> {
    return super._update(channel, dto);
  }
}
