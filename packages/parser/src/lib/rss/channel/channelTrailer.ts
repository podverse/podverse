import type { FeedObject } from 'podverse-partytime';
import type { Channel, ChannelSeason, ChannelTrailerDto, EntityManager } from '@podverse/orm';
import { ChannelTrailerService } from '@podverse/orm';
import { compatChannelTrailerDtos } from '@parser/lib/compat/partytime/channel.js';
import { timerManager } from '@parser/factories/timerManager.js';

export const handleParsedChannelTrailer = async (
  parsedFeed: FeedObject,
  channel: Channel,
  channelSeasonIndex: Record<number, ChannelSeason>,
  transactionalEntityManager?: EntityManager
) => {
  timerManager.start('handleParsedChannelTrailer');
  const channelTrailerService = new ChannelTrailerService(transactionalEntityManager);
  const channelTrailerDtos = compatChannelTrailerDtos(parsedFeed);

  const enrichedChannelTrailerDtos: ChannelTrailerDto[] = channelTrailerDtos.map(
    (channelTrailerDto) => {
      const channel_season = channelTrailerDto.season
        ? (channelSeasonIndex[channelTrailerDto.season] ?? null)
        : null;
      return {
        url: channelTrailerDto.url,
        pub_date: channelTrailerDto.pub_date,
        title: channelTrailerDto.title,
        length: channelTrailerDto.length,
        type: channelTrailerDto.type,
        channel_season,
      };
    }
  );

  if (channelTrailerDtos.length > 0) {
    await channelTrailerService.updateMany(channel, enrichedChannelTrailerDtos);
  } else {
    await channelTrailerService.deleteAll(channel);
  }
  timerManager.end('handleParsedChannelTrailer');
};
