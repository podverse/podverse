import type { EntityManager } from 'typeorm';
import type { Item } from '@orm/entities/item/item.js';
import { ItemLicense } from '@orm/entities/item/itemLicense.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';

type ItemLicenseDto = {
  identifier: string;
  url: string | null;
};

export class ItemLicenseService extends BaseOneService<ItemLicense, 'item'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ItemLicense, 'item', transactionalEntityManager);
  }

  async update(item: Item, dto: ItemLicenseDto): Promise<ItemLicense> {
    return super._update(item, dto);
  }
}
