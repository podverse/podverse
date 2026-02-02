import type { EntityManager } from 'typeorm';
import type { Channel } from '@orm/entities/channel/channel.js';
import { ChannelTxt } from '@orm/entities/channel/channelTxt.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';

type ChannelTxtDto = {
  purpose: string | null;
  value: string;
};

export class ChannelTxtService extends BaseManyService<ChannelTxt, 'channel'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ChannelTxt, 'channel', transactionalEntityManager);
  }

  async update(channel: Channel, dto: ChannelTxtDto): Promise<ChannelTxt> {
    const whereKeys = ['value'] as (keyof ChannelTxt)[];
    return super._update(channel, whereKeys, dto);
  }

  async updateMany(channel: Channel, dtos: ChannelTxtDto[]): Promise<ChannelTxt[]> {
    const whereKeys = ['value'] as (keyof ChannelTxt)[];
    return super._updateMany(channel, whereKeys, dtos);
  }

  async deleteAll(channel: Channel): Promise<void> {
    return super._deleteAll(channel);
  }
}
