import type { EntityManager } from 'typeorm';
import type { Channel } from '@orm/entities/channel/channel.js';
import type { ChannelSeason } from '@orm/entities/channel/channelSeason.js';
import { ChannelTrailer } from '@orm/entities/channel/channelTrailer.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';

export type ChannelTrailerDto = {
  url: string;
  pub_date: Date;
  title: string | null;
  length: number | null;
  type: string | null;
  channel_season: ChannelSeason | null;
};

export class ChannelTrailerService extends BaseManyService<ChannelTrailer, 'channel'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ChannelTrailer, 'channel', transactionalEntityManager);
  }

  async update(channel: Channel, dto: ChannelTrailerDto): Promise<ChannelTrailer> {
    const whereKeys = ['url'] as (keyof ChannelTrailer)[];
    return super._update(channel, whereKeys, dto);
  }

  async updateMany(channel: Channel, dtos: ChannelTrailerDto[]): Promise<ChannelTrailer[]> {
    const whereKeys = ['url'] as (keyof ChannelTrailer)[];
    return super._updateMany(channel, whereKeys, dtos, { relations: ['channel_season'] });
  }

  async deleteAll(channel: Channel): Promise<void> {
    return super._deleteAll(channel);
  }
}
