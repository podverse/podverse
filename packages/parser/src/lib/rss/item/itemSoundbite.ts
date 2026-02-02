import type { Episode } from 'podverse-partytime';
import type { EntityManager, Item } from '@podverse/orm';
import { ItemSoundbiteService } from '@podverse/orm';
import { compatItemSoundbiteDtos } from '@parser/lib/compat/partytime/item.js';
import { handleParsedManyData } from '../base/handleParsedManyData.js';

export const handleParsedItemSoundbite = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemSoundbiteService = new ItemSoundbiteService(transactionalEntityManager);
  const itemSoundbiteDtos = compatItemSoundbiteDtos(parsedItem);
  await handleParsedManyData(item, itemSoundbiteService, itemSoundbiteDtos);
};
