import type { Channel } from '@orm/entities/channel/channel.js';
import { ChannelCategory } from '@orm/entities/channel/channelCategory.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import type { EntityManager } from 'typeorm';

type ChannelCategoryDto = {
  category_id: number;
};

export class ChannelCategoryService extends BaseManyService<ChannelCategory, 'channel'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ChannelCategory, 'channel', transactionalEntityManager);
  }

  async getAll(channel: Channel): Promise<ChannelCategory[]> {
    return super._getAll(channel);
  }

  async updateMany(channel: Channel, dtos: ChannelCategoryDto[]): Promise<ChannelCategory[]> {
    const whereKeys = ['category_id'] as (keyof ChannelCategory)[];
    return super._updateMany(channel, whereKeys, dtos);
  }

  async deleteAll(channel: Channel): Promise<void> {
    return super._deleteAll(channel);
  }
}
