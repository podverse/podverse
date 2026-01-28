import { FeedObject } from 'podverse-partytime';
import { Channel, ChannelFundingService, EntityManager } from '@podverse/orm';
import { compatChannelFundingDtos } from '@parser/lib/compat/partytime/channel';
import { handleParsedManyData } from '../base/handleParsedManyData';
import { timerManager } from '@parser/factories/timerManager';

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
