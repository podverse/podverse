import type { ItemEnclosure } from '@orm/entities/item/itemEnclosure.js';
import { ItemEnclosureIntegrity } from '@orm/entities/item/itemEnclosureIntegrity.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';
import type { EntityManager } from 'typeorm';

type ItemEnclosureIntegrityDto = {
  type: 'sri' | 'pgp-signature';
  value: string;
};

export class ItemEnclosureIntegrityService extends BaseOneService<
  ItemEnclosureIntegrity,
  'item_enclosure'
> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ItemEnclosureIntegrity, 'item_enclosure', transactionalEntityManager);
  }

  async update(
    item_enclosure: ItemEnclosure,
    dto: ItemEnclosureIntegrityDto
  ): Promise<ItemEnclosureIntegrity> {
    return super._update(item_enclosure, dto);
  }
}
