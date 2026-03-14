import type { Item } from '@orm/entities/item/item.js';
import { ItemEnclosure } from '@orm/entities/item/itemEnclosure.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import type { EntityManager } from 'typeorm';

type ItemEnclosureDto = {
  type: string;
  length: number | null;
  bitrate: number | null;
  height: number | null;
  language: string | null;
  title: string | null;
  rel: string | null;
  codecs: string | null;
  item_enclosure_default: boolean;
};

export class ItemEnclosureService extends BaseManyService<ItemEnclosure, 'item'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ItemEnclosure, 'item', transactionalEntityManager);
  }

  async update(item: Item, dto: ItemEnclosureDto): Promise<ItemEnclosure> {
    const whereKeys = ['type', 'bitrate'] as (keyof ItemEnclosure)[];
    return super._update(item, whereKeys, dto);
  }

  async updateMany(item: Item, dtos: ItemEnclosureDto[]): Promise<ItemEnclosure[]> {
    const whereKeys = ['type', 'bitrate'] as (keyof ItemEnclosure)[];
    return super._updateMany(item, whereKeys, dtos);
  }

  async deleteAll(item: Item): Promise<void> {
    return super._deleteAll(item);
  }
}
