import type { EntityManager } from 'typeorm';
import type { Item } from '@orm/entities/item/item.js';
import { ItemSeasonEpisode } from '@orm/entities/item/itemSeasonEpisode.js';
import { BaseOneService } from '../base/baseOneService.js';

type ItemSeasonEpisodeDto = {
  display: string | null;
  episode: number;
};

export class ItemSeasonEpisodeService extends BaseOneService<ItemSeasonEpisode, 'item'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ItemSeasonEpisode, 'item', transactionalEntityManager);
  }

  async update(item: Item, dto: ItemSeasonEpisodeDto): Promise<ItemSeasonEpisode> {
    return super._update(item, dto);
  }
}
