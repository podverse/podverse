import type { Episode } from 'podverse-partytime';

import type { EntityManager, Item } from '@podverse/orm';
import { ItemChatService } from '@podverse/orm';
import { compatItemChatDto } from '@podverse/parser-mapping';

import { handleParsedOneData } from '../base/handleParsedOneData.js';

export const handleParsedItemChat = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemChatService = new ItemChatService(transactionalEntityManager);
  const itemChatDto = compatItemChatDto(parsedItem);
  await handleParsedOneData(item, itemChatService, itemChatDto);
};
