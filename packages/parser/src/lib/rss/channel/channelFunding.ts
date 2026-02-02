import type { FeedObject } from 'podverse-partytime';
import type { Channel, EntityManager } from '@podverse/orm';
import { ChannelFundingService } from '@podverse/orm';
import { compatChannelFundingDtos } from '@podverse/parser-mapping';
import { handleParsedManyData } from '../base/handleParsedManyData.js';
import { timerManager } from '@parser/factories/timerManager.js';

export const handleParsedChannelFunding = async (
  parsedFeed: FeedObject,
  channel: Channel,
  transactionalEntityManager?: EntityManager
) => {
  timerManager.start('handleParsedChannelFunding');
  const channelFundingService = new ChannelFundingService(transactionalEntityManager);
  const channelFundingDtos = compatChannelFundingDtos(parsedFeed);
  await handleParsedManyData(channel, channelFundingService, channelFundingDtos);
  timerManager.end('handleParsedChannelFunding');
};
