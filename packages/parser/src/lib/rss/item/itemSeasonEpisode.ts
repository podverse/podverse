import { Episode } from 'podverse-partytime';
import { EntityManager, Item, ItemSeasonEpisodeService } from '@podverse/orm';
import { compatItemSeasonEpisodeDto } from '@parser/lib/compat/partytime/item';
import { handleParsedOneData } from '../base/handleParsedOneData';

export const handleParsedItemSeasonEpisode = async (
  parsedItem: Episode,
  item: Item,
  transactionalEntityManager?: EntityManager
) => {
  const itemSeasonEpisodeService = new ItemSeasonEpisodeService(transactionalEntityManager);
  const itemSeasonEpisodeDto = compatItemSeasonEpisodeDto(parsedItem);
  await handleParsedOneData(item, itemSeasonEpisodeService, itemSeasonEpisodeDto);
};
