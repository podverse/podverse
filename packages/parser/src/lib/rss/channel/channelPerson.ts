import type { FeedObject } from 'podverse-partytime';
import type { Channel, EntityManager } from '@podverse/orm';
import { ChannelPersonService } from '@podverse/orm';
import { compatChannelPersonDtos } from '@podverse/parser-mapping';
import { handleParsedManyData } from '../base/handleParsedManyData.js';
import { timerManager } from '@parser/factories/timerManager.js';

export const handleParsedChannelPerson = async (
  parsedFeed: FeedObject,
  channel: Channel,
  transactionalEntityManager?: EntityManager
) => {
  timerManager.start('handleParsedChannelPerson');
  const channelPersonService = new ChannelPersonService(transactionalEntityManager);
  const channelPersonDtos = compatChannelPersonDtos(parsedFeed);
  await handleParsedManyData(channel, channelPersonService, channelPersonDtos);
  timerManager.end('handleParsedChannelPerson');
};
