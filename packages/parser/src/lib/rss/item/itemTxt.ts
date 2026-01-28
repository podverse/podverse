import { Episode } from 'podverse-partytime';
import { EntityManager, Item, ItemTxtService } from '@podverse/orm';
import { compatItemTxtDtos } from '@parser/lib/compat/partytime/item';
import { handleParsedManyData } from '../base/handleParsedManyData';

export const handleParsedItemTxt = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemTxtService = new ItemTxtService(transactionalEntityManager);
  const itemTxtDtos = compatItemTxtDtos(parsedItem);
  await handleParsedManyData(item, itemTxtService, itemTxtDtos);
};
