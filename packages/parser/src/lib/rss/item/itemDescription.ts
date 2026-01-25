import { Episode } from 'podverse-partytime';
import { EntityManager, Item, ItemDescriptionService } from '@podverse/orm';
import { compatItemDescriptionDto } from '@parser/lib/compat/partytime/item';
import { handleParsedOneData } from '../base/handleParsedOneData';

export const handleParsedItemDescription = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager,
) => {
  const itemDescriptionService = new ItemDescriptionService(transactionalEntityManager);
  const itemDescriptionDto = compatItemDescriptionDto(parsedItem);
  await handleParsedOneData(item, itemDescriptionService, itemDescriptionDto);
};
