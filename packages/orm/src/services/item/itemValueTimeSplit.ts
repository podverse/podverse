import type { EntityManager } from 'typeorm';
import type { ItemValue } from '@orm/entities/item/itemValue.js';
import { ItemValueTimeSplit } from '@orm/entities/item/itemValueTimeSplit.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';

type ItemValueTimeSplitDto = {
  start_time: string;
  duration: string;
  remote_start_time: string;
  remote_percentage: string;
};

export class ItemValueTimeSplitService extends BaseManyService<ItemValueTimeSplit, 'item_value'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ItemValueTimeSplit, 'item_value', transactionalEntityManager);
  }

  async update(item_value: ItemValue, dto: ItemValueTimeSplitDto): Promise<ItemValueTimeSplit> {
    const whereKeys = ['start_time', 'duration'] as (keyof ItemValueTimeSplit)[];
    return super._update(item_value, whereKeys, dto);
  }

  async updateMany(
    item_value: ItemValue,
    dtos: ItemValueTimeSplitDto[]
  ): Promise<ItemValueTimeSplit[]> {
    const whereKeys = ['start_time', 'duration'] as (keyof ItemValueTimeSplit)[];
    return super._updateMany(item_value, whereKeys, dtos);
  }

  async deleteAll(item_value: ItemValue): Promise<void> {
    return super._deleteAll(item_value);
  }
}
