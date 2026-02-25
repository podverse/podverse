import type { Episode } from 'podverse-partytime';
import type { EntityManager, Item } from '@podverse/orm';
import { ItemAboutService } from '@podverse/orm';
import { compatItemAboutDto } from '@podverse/parser-mapping';

export const handleParsedItemAbout = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemAboutService = new ItemAboutService(transactionalEntityManager);
  const itemAboutDto = compatItemAboutDto(parsedItem);
  await itemAboutService.update(item, itemAboutDto);
};
