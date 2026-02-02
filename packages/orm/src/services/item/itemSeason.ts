import type { EntityManager } from 'typeorm';
import type { Item } from '@orm/entities/item/item.js';
import { ItemSeason } from '@orm/entities/item/itemSeason.js';
import { BaseOneService } from '../base/baseOneService.js';
import type { ChannelSeason } from '@orm/entities/channel/channelSeason.js';

export type ItemSeasonDto = {
  title: string | null;
  channel_season: ChannelSeason;
};

export class ItemSeasonService extends BaseOneService<ItemSeason, 'item'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ItemSeason, 'item', transactionalEntityManager);
  }

  async update(item: Item, dto: ItemSeasonDto): Promise<ItemSeason> {
    return super._update(item, dto, { relations: ['channel_season'] });
  }
}
