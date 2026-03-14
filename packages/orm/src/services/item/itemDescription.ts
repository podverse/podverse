import type { Item } from '@orm/entities/item/item.js';
import { ItemDescription } from '@orm/entities/item/itemDescription.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';
import type { EntityManager } from 'typeorm';

type ItemDescriptionDto = {
  value: string;
};

export class ItemDescriptionService extends BaseOneService<ItemDescription, 'item'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ItemDescription, 'item', transactionalEntityManager);
  }

  async update(item: Item, dto: ItemDescriptionDto): Promise<ItemDescription> {
    return super._update(item, dto);
  }
}
