import type { EntityManager } from 'typeorm';
import { ItemValueMetaBoost } from '@orm/entities/item/itemValueMetaBoost.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';

export type ItemValueMetaBoostDto = {
  type: string;
  schema: string;
  license?: string | null;
  node: string;
};

export class ItemValueMetaBoostService extends BaseOneService<ItemValueMetaBoost, 'item_value'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ItemValueMetaBoost, 'item_value', transactionalEntityManager);
  }

  update(
    item_value: ItemValueMetaBoost['item_value'],
    dto: ItemValueMetaBoostDto
  ): Promise<ItemValueMetaBoost> {
    return this._update(item_value, dto);
  }

  delete(item_value: ItemValueMetaBoost['item_value']): Promise<void> {
    return this._delete(item_value);
  }
}
