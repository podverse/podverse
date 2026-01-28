import { Episode } from 'podverse-partytime';
import { EntityManager, Item, ItemSocialInteractService } from '@podverse/orm';
import { compatItemSocialInteractDtos } from '@parser/lib/compat/partytime/item';
import { handleParsedManyData } from '../base/handleParsedManyData';

export const handleParsedItemSocialInteract = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemSocialInteractService = new ItemSocialInteractService(transactionalEntityManager);
  const itemSocialInteractDtos = compatItemSocialInteractDtos(parsedItem);
  await handleParsedManyData(item, itemSocialInteractService, itemSocialInteractDtos);
};
