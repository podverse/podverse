import { timerManager } from '@parser/factories/timerManager.js';
import type { FeedObject } from 'podverse-partytime';

import type { Channel, EntityManager } from '@podverse/orm';
import { ChannelTxtService } from '@podverse/orm';
import { compatChannelTxtDtos } from '@podverse/parser-mapping';

import { handleParsedManyData } from '../base/handleParsedManyData.js';

export const handleParsedChannelTxt = async (
  parsedFeed: FeedObject,
  channel: Channel,
  transactionalEntityManager?: EntityManager
) => {
  timerManager.start('handleParsedChannelTxt');
  const channelTxtService = new ChannelTxtService(transactionalEntityManager);
  const channelTxtDtos = compatChannelTxtDtos(parsedFeed);
  await handleParsedManyData(channel, channelTxtService, channelTxtDtos);
  timerManager.end('handleParsedChannelTxt');
};
