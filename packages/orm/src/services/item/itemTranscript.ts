import type { EntityManager, FindManyOptions } from 'typeorm';
import type { Item } from '@orm/entities/item/item.js';
import { ItemTranscript } from '@orm/entities/item/itemTranscript.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';

type ItemTranscriptDto = {
  url: string;
  title?: string | null;
};

export class ItemTranscriptService extends BaseManyService<ItemTranscript, 'item'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ItemTranscript, 'item', transactionalEntityManager);
  }

  async getMany(options?: FindManyOptions<ItemTranscript>): Promise<ItemTranscript[]> {
    return this.repositoryRead.find(options);
  }

  async update(item: Item, dto: ItemTranscriptDto): Promise<ItemTranscript> {
    const whereKeys = ['url'] as (keyof ItemTranscript)[];
    return super._update(item, whereKeys, dto);
  }

  async updateMany(item: Item, dtos: ItemTranscriptDto[]): Promise<ItemTranscript[]> {
    const whereKeys = ['url'] as (keyof ItemTranscript)[];
    return super._updateMany(item, whereKeys, dtos);
  }

  async deleteAll(item: Item): Promise<void> {
    return super._deleteAll(item);
  }
}
