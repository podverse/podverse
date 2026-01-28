import { Episode } from 'podverse-partytime';
import { EntityManager, Item, ItemLocationService } from '@podverse/orm';
import { compatItemLocationDto } from '@parser/lib/compat/partytime/item';
import { handleParsedOneData } from '../base/handleParsedOneData';

export const handleParsedItemLocation = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemLocationService = new ItemLocationService(transactionalEntityManager);
  const itemLocationDto = compatItemLocationDto(parsedItem);
  await handleParsedOneData(item, itemLocationService, itemLocationDto);
};
