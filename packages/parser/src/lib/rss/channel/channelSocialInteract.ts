import type { FeedObject } from 'podverse-partytime';
import type { Channel, EntityManager } from '@podverse/orm';
import { ChannelSocialInteractService } from '@podverse/orm';
import { compatChannelSocialInteractDtos } from '@podverse/parser-mapping';
import { handleParsedManyData } from '../base/handleParsedManyData.js';
import { timerManager } from '@parser/factories/timerManager.js';

export const handleParsedChannelSocialInteract = async (
  parsedFeed: FeedObject,
  channel: Channel,
  transactionalEntityManager?: EntityManager
) => {
  timerManager.start('handleParsedChannelSocialInteract');
  const channelSocialInteractService = new ChannelSocialInteractService(transactionalEntityManager);
  const channelSocialInteractDtos = compatChannelSocialInteractDtos(parsedFeed);
  await handleParsedManyData(channel, channelSocialInteractService, channelSocialInteractDtos);
  timerManager.end('handleParsedChannelSocialInteract');
};
