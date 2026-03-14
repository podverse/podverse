import { timerManager } from '@parser/factories/timerManager.js';
import type { FeedObject } from 'podverse-partytime';

import type { Channel, EntityManager } from '@podverse/orm';
import { ChannelImageService } from '@podverse/orm';
import { compatChannelImageDtos } from '@podverse/parser-mapping';

import { handleParsedManyData } from '../base/handleParsedManyData.js';

export const handleParsedChannelImage = async (
  parsedFeed: FeedObject,
  channel: Channel,
  transactionalEntityManager?: EntityManager
) => {
  timerManager.start('handleParsedChannelImage');
  const channelImageService = new ChannelImageService(transactionalEntityManager);
  const channelImageDtos = compatChannelImageDtos(parsedFeed);
  await handleParsedManyData(channel, channelImageService, channelImageDtos);
  timerManager.end('handleParsedChannelImage');
};
