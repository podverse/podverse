import type { FeedObject } from 'podverse-partytime';
import type { Channel, EntityManager } from '@podverse/orm';
import { ChannelAboutService } from '@podverse/orm';
import { compatChannelAboutDto } from '@parser/lib/compat/partytime/channel.js';
import { timerManager } from '@parser/factories/timerManager.js';

export const handleParsedChannelAbout = async (
  parsedFeed: FeedObject,
  channel: Channel,
  transactionalEntityManager?: EntityManager
) => {
  timerManager.start('handleParsedChannelAbout');
  const channelAboutService = new ChannelAboutService(transactionalEntityManager);
  const channelAboutDto = compatChannelAboutDto(parsedFeed);
  await channelAboutService.update(channel, channelAboutDto);
  timerManager.end('handleParsedChannelAbout');
};
