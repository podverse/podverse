import { RemoteItemDto } from '@podverse/helpers';
import { EntityManager } from 'typeorm';
import { ItemValueTimeSplit } from '@orm/entities/item/itemValueTimeSplit';
import { ItemValueTimeSplitRemoteItem } from '@orm/entities/item/itemValueTimeSplitRemoteItem';
import { BaseRemoteItemsService } from '@orm/services/base/baseRemoteItemsService';

export class ItemValueTimeSplitRemoteItemService extends BaseRemoteItemsService<ItemValueTimeSplitRemoteItem, 'item_value_time_split'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ItemValueTimeSplitRemoteItem, 'item_value_time_split', transactionalEntityManager);
  }

  async update(item_value_time_split: ItemValueTimeSplit, dto: RemoteItemDto): Promise<ItemValueTimeSplitRemoteItem> {
    return super.update(item_value_time_split, dto);
  }

  async deleteAll(item_value_time_split: ItemValueTimeSplit): Promise<void> {
    return super._deleteAll(item_value_time_split);
  }
}
