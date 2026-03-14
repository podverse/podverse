import type { Channel } from '@orm/entities/channel/channel.js';
import { ChannelFunding } from '@orm/entities/channel/channelFunding.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import type { EntityManager } from 'typeorm';

type ChannelFundingDto = {
  url: string;
  title: string | null;
};

export class ChannelFundingService extends BaseManyService<ChannelFunding, 'channel'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ChannelFunding, 'channel', transactionalEntityManager);
  }

  async update(channel: Channel, dto: ChannelFundingDto): Promise<ChannelFunding> {
    const whereKeys = ['url'] as (keyof ChannelFunding)[];
    return super._update(channel, whereKeys, dto);
  }

  async updateMany(channel: Channel, dtos: ChannelFundingDto[]): Promise<ChannelFunding[]> {
    const whereKeys = ['url'] as (keyof ChannelFunding)[];
    return super._updateMany(channel, whereKeys, dtos);
  }

  async deleteAll(channel: Channel): Promise<void> {
    return super._deleteAll(channel);
  }
}
