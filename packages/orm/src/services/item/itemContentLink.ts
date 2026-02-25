import type { EntityManager } from 'typeorm';
import type { Item } from '@orm/entities/item/item.js';
import { ItemContentLink } from '@orm/entities/item/itemContentLink.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';

type ItemContentLinkDto = {
  href: string;
  title?: string | null;
};

export class ItemContentLinkService extends BaseManyService<ItemContentLink, 'item'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ItemContentLink, 'item', transactionalEntityManager);
  }

  async update(item: Item, dto: ItemContentLinkDto): Promise<ItemContentLink> {
    const whereKeys = ['href'] as (keyof ItemContentLink)[];
    return super._update(item, whereKeys, dto);
  }

  async updateMany(item: Item, dtos: ItemContentLinkDto[]): Promise<ItemContentLink[]> {
    const whereKeys = ['href'] as (keyof ItemContentLink)[];
    return super._updateMany(item, whereKeys, dtos);
  }
}
