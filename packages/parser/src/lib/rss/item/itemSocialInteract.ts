import type { Episode } from 'podverse-partytime';
import type { EntityManager, Item } from '@podverse/orm';
import { ItemSocialInteractService } from '@podverse/orm';
import { compatItemSocialInteractDtos } from '@parser/lib/compat/partytime/item.js';
import { handleParsedManyData } from '../base/handleParsedManyData.js';

export const handleParsedItemSocialInteract = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemSocialInteractService = new ItemSocialInteractService(transactionalEntityManager);
  const itemSocialInteractDtos = compatItemSocialInteractDtos(parsedItem);
  await handleParsedManyData(item, itemSocialInteractService, itemSocialInteractDtos);
};
