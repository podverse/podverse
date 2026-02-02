import type { Episode } from 'podverse-partytime';
import type { EntityManager, Item } from '@podverse/orm';
import { ItemPersonService } from '@podverse/orm';
import { compatItemPersonDtos } from '@parser/lib/compat/partytime/item.js';
import { handleParsedManyData } from '../base/handleParsedManyData.js';

export const handleParsedItemPerson = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemPersonService = new ItemPersonService(transactionalEntityManager);
  const itemPersonDtos = compatItemPersonDtos(parsedItem);
  await handleParsedManyData(item, itemPersonService, itemPersonDtos);
};
