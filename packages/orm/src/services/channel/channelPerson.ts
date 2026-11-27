import type { Channel } from '@orm/entities/channel/channel.js';
import { ChannelPerson } from '@orm/entities/channel/channelPerson.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import { readChannelPersonIds, syncChannelPeople } from '@orm/services/person/personCreditSync.js';
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
    const before = await readChannelPersonIds(this.repositoryReadWrite.manager, channel.id);
    const saved = await super._update(channel, whereKeys, dto);
    await syncChannelPeople(this.repositoryReadWrite.manager, channel.id, before);
    return saved;
  }

  async updateMany(channel: Channel, dtos: ChannelPersonDto[]): Promise<ChannelPerson[]> {
    const whereKeys = ['name'] as (keyof ChannelPerson)[];
    const before = await readChannelPersonIds(this.repositoryReadWrite.manager, channel.id);
    const saved = await super._updateMany(channel, whereKeys, dtos);
    await syncChannelPeople(this.repositoryReadWrite.manager, channel.id, before);
    return saved;
  }

  async deleteAll(channel: Channel): Promise<void> {
    const before = await readChannelPersonIds(this.repositoryReadWrite.manager, channel.id);
    await super._deleteAll(channel);
    await syncChannelPeople(this.repositoryReadWrite.manager, channel.id, before);
  }
}
