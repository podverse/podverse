import type { Channel } from '@orm/entities/channel/channel.js';
import { ChannelAbout } from '@orm/entities/channel/channelAbout.js';
import type { ChannelItunesTypeItunesTypeEnum } from '@orm/entities/channel/channelItunesType.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';
import type { EntityManager } from 'typeorm';

type ChannelAboutDto = {
  author: string | null;
  explicit: boolean | null;
  language: string | null;
  last_pub_date: Date | null;
  website_link_url: string | null;
  itunes_type: ChannelItunesTypeItunesTypeEnum;
  episode_count: number;
};

export class ChannelAboutService extends BaseOneService<ChannelAbout, 'channel'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ChannelAbout, 'channel', transactionalEntityManager);
  }

  async update(channel: Channel, dto: ChannelAboutDto): Promise<ChannelAbout> {
    return super._update(channel, dto, { relations: { itunes_type: true } });
  }
}
