import { Episode } from 'podverse-partytime';
import { EntityManager, Item, ItemChatService } from '@podverse/orm';
import { compatItemChatDto } from '@parser/lib/compat/partytime/item';
import { handleParsedOneData } from '../base/handleParsedOneData';

export const handleParsedItemChat = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemChatService = new ItemChatService(transactionalEntityManager);
  const itemChatDto = compatItemChatDto(parsedItem);
  await handleParsedOneData(item, itemChatService, itemChatDto);
};
