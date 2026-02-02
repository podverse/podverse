import type { EntityManager } from 'typeorm';
import type { Item } from '@orm/entities/item/item.js';
import { ItemChaptersFeed } from '@orm/entities/item/itemChaptersFeed.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';

type ItemChaptersFeedDto = {
  url: string;
  type: string;
};

export class ItemChaptersFeedService extends BaseOneService<ItemChaptersFeed, 'item'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ItemChaptersFeed, 'item', transactionalEntityManager);
  }

  async update(item: Item, dto: ItemChaptersFeedDto): Promise<ItemChaptersFeed> {
    return super._update(item, dto);
  }
}
