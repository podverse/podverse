import type { Episode } from 'podverse-partytime';
import type { EntityManager, Item } from '@podverse/orm';
import { ItemLocationService } from '@podverse/orm';
import { compatItemLocationDto } from '@podverse/parser-mapping';
import { handleParsedOneData } from '../base/handleParsedOneData.js';

export const handleParsedItemLocation = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemLocationService = new ItemLocationService(transactionalEntityManager);
  const itemLocationDto = compatItemLocationDto(parsedItem);
  await handleParsedOneData(item, itemLocationService, itemLocationDto);
};
