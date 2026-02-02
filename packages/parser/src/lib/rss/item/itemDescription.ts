import type { Episode } from 'podverse-partytime';
import type { EntityManager, Item } from '@podverse/orm';
import { ItemDescriptionService } from '@podverse/orm';
import { compatItemDescriptionDto } from '@podverse/parser-mapping';
import { handleParsedOneData } from '../base/handleParsedOneData.js';

export const handleParsedItemDescription = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemDescriptionService = new ItemDescriptionService(transactionalEntityManager);
  const itemDescriptionDto = compatItemDescriptionDto(parsedItem);
  await handleParsedOneData(item, itemDescriptionService, itemDescriptionDto);
};
