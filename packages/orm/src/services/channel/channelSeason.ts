import { Equal } from 'typeorm';
import type { Channel } from '@orm/entities/channel/channel.js';
import { ChannelSeason } from '@orm/entities/channel/channelSeason.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';

type ChannelSeasonDto = {
  number: number;
  name: string | null;
};

export type ChannelSeasonIndex = Record<number, ChannelSeason>;

export class ChannelSeasonService extends BaseManyService<ChannelSeason, 'channel'> {
  constructor() {
    super(ChannelSeason, 'channel');
  }

  async getChannelSeasonIndex(channel: Channel): Promise<ChannelSeasonIndex> {
    const channelSeasonIndex: ChannelSeasonIndex = {};

    const channel_seasons = await this.repositoryRead.find({
      where: { channel_id: Equal(channel.id) },
    });
    for (const channel_season of channel_seasons) {
      channelSeasonIndex[channel_season.number] = channel_season;
    }

    return channelSeasonIndex;
  }

  async update(channel: Channel, dto: ChannelSeasonDto): Promise<ChannelSeason> {
    const whereKeys = ['number'] as (keyof ChannelSeason)[];
    return super._update(channel, whereKeys, dto);
  }

  async updateMany(channel: Channel, dtos: ChannelSeasonDto[]): Promise<ChannelSeason[]> {
    const whereKeys = ['number'] as (keyof ChannelSeason)[];
    return super._updateMany(channel, whereKeys, dtos);
  }

  async deleteAll(channel: Channel): Promise<void> {
    return super._deleteAll(channel);
  }
}
