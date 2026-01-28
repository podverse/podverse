import { Episode } from 'podverse-partytime';
import { EntityManager, Item, ItemPersonService } from '@podverse/orm';
import { compatItemPersonDtos } from '@parser/lib/compat/partytime/item';
import { handleParsedManyData } from '../base/handleParsedManyData';

export const handleParsedItemPerson = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemPersonService = new ItemPersonService(transactionalEntityManager);
  const itemPersonDtos = compatItemPersonDtos(parsedItem);
  await handleParsedManyData(item, itemPersonService, itemPersonDtos);
};
