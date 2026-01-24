import { Episode } from 'podverse-partytime';
import { EntityManager, Item, ItemImageService } from '@podverse/orm';
import { compatItemImageDtos } from '@parser/lib/compat/partytime/item';
import { handleParsedManyData } from '../base/handleParsedManyData';

export const handleParsedItemImage = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager,
) => {
  const itemImageService = new ItemImageService(transactionalEntityManager);
  const itemImageDtos = compatItemImageDtos(parsedItem);
  await handleParsedManyData(item, itemImageService, itemImageDtos);
};
