import type { FeedObject } from 'podverse-partytime';
import type { Channel } from '@podverse/orm';
import { ChannelSeasonService } from '@podverse/orm';
import { compatChannelSeasonDtos } from '@parser/lib/compat/partytime/channel.js';
import { timerManager } from '@parser/factories/timerManager.js';

export const handleParsedChannelSeasons = async (
  parsedFeed: FeedObject,
  channel: Channel
): Promise<void> => {
  timerManager.start('handleParsedChannelSeasons');
  const channelSeasonService = new ChannelSeasonService();
  const channelSeasonDtos = compatChannelSeasonDtos(parsedFeed);

  if (channelSeasonDtos.length > 0) {
    await channelSeasonService.updateMany(channel, channelSeasonDtos);
  } else {
    await channelSeasonService.deleteAll(channel);
  }
  timerManager.end('handleParsedChannelSeasons');
};
