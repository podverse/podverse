import type { Item } from '@orm/entities/item/item.js';
import { ItemAbout } from '@orm/entities/item/itemAbout.js';
import type { ItemItunesEpisodeTypeEnum } from '@orm/entities/item/itemItunesEpisodeType.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';
import type { EntityManager } from 'typeorm';

type ItemAboutDto = {
  duration: string | null;
  explicit: boolean | null;
  website_link_url: string | null;
  item_itunes_episode_type: ItemItunesEpisodeTypeEnum;
};

export class ItemAboutService extends BaseOneService<ItemAbout, 'item'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ItemAbout, 'item', transactionalEntityManager);
  }

  async update(item: Item, dto: ItemAboutDto): Promise<ItemAbout> {
    return super._update(item, dto, {
      relations: { item_itunes_episode_type: true },
    });
  }
}
