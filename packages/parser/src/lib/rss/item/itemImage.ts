import type { Episode } from 'podverse-partytime';
import type { EntityManager, Item } from '@podverse/orm';
import { ItemImageService } from '@podverse/orm';
import { compatItemImageDtos } from '@podverse/parser-mapping';
import { handleParsedManyData } from '../base/handleParsedManyData.js';

export const handleParsedItemImage = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemImageService = new ItemImageService(transactionalEntityManager);
  const itemImageDtos = compatItemImageDtos(parsedItem);
  await handleParsedManyData(item, itemImageService, itemImageDtos);
};
