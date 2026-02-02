import type { Episode } from 'podverse-partytime';
import type { EntityManager, Item } from '@podverse/orm';
import { ItemSeasonEpisodeService } from '@podverse/orm';
import { compatItemSeasonEpisodeDto } from '@parser/lib/compat/partytime/item.js';
import { handleParsedOneData } from '../base/handleParsedOneData.js';

export const handleParsedItemSeasonEpisode = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemSeasonEpisodeService = new ItemSeasonEpisodeService(transactionalEntityManager);
  const itemSeasonEpisodeDto = compatItemSeasonEpisodeDto(parsedItem);
  await handleParsedOneData(item, itemSeasonEpisodeService, itemSeasonEpisodeDto);
};
