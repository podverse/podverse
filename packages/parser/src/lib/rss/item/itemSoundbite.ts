import { Episode } from 'podverse-partytime';
import { EntityManager, Item, ItemSoundbiteService } from '@podverse/orm';
import { compatItemSoundbiteDtos } from '@parser/lib/compat/partytime/item';
import { handleParsedManyData } from '../base/handleParsedManyData';

export const handleParsedItemSoundbite = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemSoundbiteService = new ItemSoundbiteService(transactionalEntityManager);
  const itemSoundbiteDtos = compatItemSoundbiteDtos(parsedItem);
  await handleParsedManyData(item, itemSoundbiteService, itemSoundbiteDtos);
};
