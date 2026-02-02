import type { FeedObject } from 'podverse-partytime';
import type { Channel, EntityManager } from '@podverse/orm';
import { ChannelDescriptionService } from '@podverse/orm';
import { compatChannelDescriptionDto } from '@parser/lib/compat/partytime/channel.js';
import { handleParsedOneData } from '../base/handleParsedOneData.js';
import { timerManager } from '@parser/factories/timerManager.js';

export const handleParsedChannelDescription = async (
  parsedFeed: FeedObject,
  channel: Channel,
  transactionalEntityManager?: EntityManager
) => {
  timerManager.start('handleParsedChannelDescription');
  const channelDescriptionService = new ChannelDescriptionService(transactionalEntityManager);
  const channelDescriptionDto = compatChannelDescriptionDto(parsedFeed);
  await handleParsedOneData(channel, channelDescriptionService, channelDescriptionDto);
  timerManager.end('handleParsedChannelDescription');
};
