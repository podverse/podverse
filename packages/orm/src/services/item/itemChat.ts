import type { EntityManager } from 'typeorm';
import type { Item } from '@orm/entities/item/item.js';
import { ItemChat } from '@orm/entities/item/itemChat.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';

type ItemChatDto = {
  server: string;
  protocol: string | null;
  account_id: string | null;
  space: string | null;
};

export class ItemChatService extends BaseOneService<ItemChat, 'item'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ItemChat, 'item', transactionalEntityManager);
  }

  async update(item: Item, dto: ItemChatDto): Promise<ItemChat> {
    return super._update(item, dto);
  }
}
