import { Episode } from 'podverse-partytime';
import { ChannelSeasonIndex, EntityManager, Item, ItemSeasonDto,
  ItemSeasonService } from '@podverse/orm';
import { compatItemSeasonDto } from '@parser/lib/compat/partytime/item';
import { handleParsedOneData } from '../base/handleParsedOneData';

export const handleParsedItemSeason = async (
  parsedItem: Episode,
  item: Item,
  channelSeasonIndex: ChannelSeasonIndex,
  transactionalEntityManager?: EntityManager,
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
