import { timerManager } from '@parser/factories/timerManager.js';
import type { FeedObject } from 'podverse-partytime';

import type { Channel, EntityManager } from '@podverse/orm';
import { ChannelLocationService } from '@podverse/orm';
import { compatChannelLocationDto } from '@podverse/parser-mapping';

import { handleParsedOneData } from '../base/handleParsedOneData.js';

export const handleParsedChannelLocation = async (
  parsedFeed: FeedObject,
  channel: Channel,
  transactionalEntityManager?: EntityManager
) => {
  timerManager.start('handleParsedChannelLocation');
  const channelLocationService = new ChannelLocationService(transactionalEntityManager);
  const channelLocationDtos = compatChannelLocationDto(parsedFeed);
  await handleParsedOneData(channel, channelLocationService, channelLocationDtos);
  timerManager.end('handleParsedChannelLocation');
};
