import type { Episode } from 'podverse-partytime';
import type { EntityManager, Item } from '@podverse/orm';
import { ItemTxtService } from '@podverse/orm';
import { compatItemTxtDtos } from '@parser/lib/compat/partytime/item.js';
import { handleParsedManyData } from '../base/handleParsedManyData.js';

export const handleParsedItemTxt = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemTxtService = new ItemTxtService(transactionalEntityManager);
  const itemTxtDtos = compatItemTxtDtos(parsedItem);
  await handleParsedManyData(item, itemTxtService, itemTxtDtos);
};
