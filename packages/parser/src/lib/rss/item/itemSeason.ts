import type { Episode } from 'podverse-partytime';
import type { ChannelSeasonIndex, EntityManager, Item, ItemSeasonDto } from '@podverse/orm';
import { ItemSeasonService } from '@podverse/orm';
import { compatItemSeasonDto } from '@podverse/parser-mapping';
import { handleParsedOneData } from '../base/handleParsedOneData.js';

export const handleParsedItemSeason = async (
  parsedItem: Episode,
  item: Item,
  channelSeasonIndex: ChannelSeasonIndex,
  transactionalEntityManager?: EntityManager
) => {
  const itemSeasonService = new ItemSeasonService(transactionalEntityManager);
  const itemSeasonDto = compatItemSeasonDto(parsedItem);

  if (itemSeasonDto) {
    const channel_season = itemSeasonDto.number ? channelSeasonIndex[itemSeasonDto.number] : null;
    if (channel_season) {
      const enrichedItemSeasonDto: ItemSeasonDto = {
        title: itemSeasonDto.title,
        channel_season,
      };
      await handleParsedOneData(item, itemSeasonService, enrichedItemSeasonDto);
    }
  }
};
