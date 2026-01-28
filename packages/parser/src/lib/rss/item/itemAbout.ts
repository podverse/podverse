import { Episode } from 'podverse-partytime';
import { EntityManager, Item, ItemAboutService } from '@podverse/orm';
import { compatItemAboutDto } from '@parser/lib/compat/partytime/item';

export const handleParsedItemAbout = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemAboutService = new ItemAboutService(transactionalEntityManager);
  const itemAboutDto = compatItemAboutDto(parsedItem);
  await itemAboutService.update(item, itemAboutDto);
};
