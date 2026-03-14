import type { Episode } from 'podverse-partytime';

import type { EntityManager, Item } from '@podverse/orm';
import { ItemChaptersFeedService } from '@podverse/orm';
import { compatItemChaptersFeedDto } from '@podverse/parser-mapping';

import { handleParsedOneData } from '../base/handleParsedOneData.js';

export const handleParsedItemChaptersFeed = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemChaptersFeedService = new ItemChaptersFeedService(transactionalEntityManager);
  const itemChaptersFeedDto = compatItemChaptersFeedDto(parsedItem);
  await handleParsedOneData(item, itemChaptersFeedService, itemChaptersFeedDto);
};
