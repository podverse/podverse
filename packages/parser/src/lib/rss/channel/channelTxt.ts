import type { FeedObject } from 'podverse-partytime';
import type { Channel, EntityManager } from '@podverse/orm';
import { ChannelTxtService } from '@podverse/orm';
import { compatChannelTxtDtos } from '@parser/lib/compat/partytime/channel.js';
import { handleParsedManyData } from '../base/handleParsedManyData.js';
import { timerManager } from '@parser/factories/timerManager.js';

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
