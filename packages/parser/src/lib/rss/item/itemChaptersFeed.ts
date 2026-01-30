import { Episode } from 'podverse-partytime';
import { EntityManager, Item, ItemChaptersFeedService } from '@podverse/orm';
import { compatItemChaptersFeedDto } from '@parser/lib/compat/partytime/item';
import { handleParsedOneData } from '../base/handleParsedOneData';

export const handleParsedItemChaptersFeed = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemChaptersFeedService = new ItemChaptersFeedService(transactionalEntityManager);
  const itemChaptersFeedDto = compatItemChaptersFeedDto(parsedItem);
  await handleParsedOneData(item, itemChaptersFeedService, itemChaptersFeedDto);
};
