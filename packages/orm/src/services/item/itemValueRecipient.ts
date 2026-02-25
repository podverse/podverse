import type { EntityManager } from 'typeorm';
import type { ItemValue } from '@orm/entities/item/itemValue.js';
import { ItemValueRecipient } from '@orm/entities/item/itemValueRecipient.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';

type ItemValueRecipientDto = {
  type: string;
  address: string;
  split: number;
  name: string | null;
  custom_key: string | null;
  custom_value: string | null;
  fee: boolean;
};

export class ItemValueRecipientService extends BaseManyService<ItemValueRecipient, 'item_value'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ItemValueRecipient, 'item_value', transactionalEntityManager);
  }

  async update(item_value: ItemValue, dto: ItemValueRecipientDto): Promise<ItemValueRecipient> {
    const whereKeys = [
      'type',
      'address',
      'custom_key',
      'custom_value',
    ] as (keyof ItemValueRecipient)[];
    return super._update(item_value, whereKeys, dto);
  }

  async updateMany(
    item_value: ItemValue,
    dtos: ItemValueRecipientDto[]
  ): Promise<ItemValueRecipient[]> {
    const whereKeys = [
      'type',
      'address',
      'custom_key',
      'custom_value',
    ] as (keyof ItemValueRecipient)[];
    return super._updateMany(item_value, whereKeys, dtos);
  }

  async deleteAll(item_value: ItemValue): Promise<void> {
    return super._deleteAll(item_value);
  }
}
