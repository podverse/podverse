import type { Item } from '@orm/entities/item/item.js';
import { ItemSocialInteract } from '@orm/entities/item/itemSocialInteract.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import type { EntityManager } from 'typeorm';

type ItemSocialInteractDto = {
  protocol: string;
  uri: string;
  account_id: string | null;
  account_url: string | null;
  priority: number | null;
};

export class ItemSocialInteractService extends BaseManyService<ItemSocialInteract, 'item'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ItemSocialInteract, 'item', transactionalEntityManager);
  }

  async update(item: Item, dto: ItemSocialInteractDto): Promise<ItemSocialInteract> {
    const whereKeys = ['uri'] as (keyof ItemSocialInteract)[];
    return super._update(item, whereKeys, dto);
  }

  async updateMany(item: Item, dtos: ItemSocialInteractDto[]): Promise<ItemSocialInteract[]> {
    const whereKeys = ['uri'] as (keyof ItemSocialInteract)[];
    return super._updateMany(item, whereKeys, dtos);
  }

  async deleteAll(item: Item): Promise<void> {
    return super._deleteAll(item);
  }
}
