import type { Channel } from '@orm/entities/channel/channel.js';
import { ChannelPerson } from '@orm/entities/channel/channelPerson.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import type { EntityManager } from 'typeorm';

type ChannelPersonDto = {
  name: string;
  role: string | null;
  person_group: string | 'cast';
  img: string | null;
  href: string | null;
};

export class ChannelPersonService extends BaseManyService<ChannelPerson, 'channel'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ChannelPerson, 'channel', transactionalEntityManager);
  }

  async update(channel: Channel, dto: ChannelPersonDto): Promise<ChannelPerson> {
    const whereKeys = ['name'] as (keyof ChannelPerson)[];
    return super._update(channel, whereKeys, dto);
  }

  async updateMany(channel: Channel, dtos: ChannelPersonDto[]): Promise<ChannelPerson[]> {
    const whereKeys = ['name'] as (keyof ChannelPerson)[];
    return super._updateMany(channel, whereKeys, dtos);
  }

  async deleteAll(channel: Channel): Promise<void> {
    return super._deleteAll(channel);
  }
}
