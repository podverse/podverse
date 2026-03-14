import type { Item } from '@orm/entities/item/item.js';
import { ItemTxt } from '@orm/entities/item/itemTxt.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import type { EntityManager } from 'typeorm';

type ItemTxtDto = {
  purpose: string | null;
  value: string;
};

export class ItemTxtService extends BaseManyService<ItemTxt, 'item'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ItemTxt, 'item', transactionalEntityManager);
  }

  async update(item: Item, dto: ItemTxtDto): Promise<ItemTxt> {
    const whereKeys = ['value'] as (keyof ItemTxt)[];
    return super._update(item, whereKeys, dto);
  }

  async updateMany(item: Item, dtos: ItemTxtDto[]): Promise<ItemTxt[]> {
    const whereKeys = ['value'] as (keyof ItemTxt)[];
    return super._updateMany(item, whereKeys, dtos);
  }

  async deleteAll(item: Item): Promise<void> {
    return super._deleteAll(item);
  }
}
