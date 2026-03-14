import type { Item } from '@orm/entities/item/item.js';
import { ItemLocation } from '@orm/entities/item/itemLocation.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';
import type { EntityManager } from 'typeorm';

type ItemLocationDto = {
  geo: string | null;
  osm: string | null;
  name: string | null;
};

export class ItemLocationService extends BaseOneService<ItemLocation, 'item'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ItemLocation, 'item', transactionalEntityManager);
  }

  async update(item: Item, dto: ItemLocationDto): Promise<ItemLocation> {
    return super._update(item, dto);
  }
}
