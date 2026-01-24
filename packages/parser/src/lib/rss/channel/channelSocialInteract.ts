import { FeedObject } from 'podverse-partytime';
import { Channel, ChannelSocialInteractService, EntityManager } from '@podverse/orm';
import { compatChannelSocialInteractDtos } from '@parser/lib/compat/partytime/channel';
import { handleParsedManyData } from '../base/handleParsedManyData';
import { timerManager } from '@parser/factories/timerManager';

export const handleParsedChannelSocialInteract = async (
  parsedFeed: FeedObject,
  channel: Channel,
  transactionalEntityManager?: EntityManager,
) => {
  timerManager.start('handleParsedChannelSocialInteract');
  const channelSocialInteractService = new ChannelSocialInteractService(transactionalEntityManager);
  const channelSocialInteractDtos = compatChannelSocialInteractDtos(parsedFeed);
  await handleParsedManyData(channel, channelSocialInteractService, channelSocialInteractDtos);
  timerManager.end('handleParsedChannelSocialInteract');
};
