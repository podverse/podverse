import { FeedObject } from 'podverse-partytime';
import { Channel, ChannelPersonService, EntityManager } from '@podverse/orm';
import { compatChannelPersonDtos } from '@parser/lib/compat/partytime/channel';
import { handleParsedManyData } from '../base/handleParsedManyData';
import { timerManager } from '@parser/factories/timerManager';

export const handleParsedChannelPerson = async (
  parsedFeed: FeedObject,
  channel: Channel,
  transactionalEntityManager?: EntityManager,
) => {
  timerManager.start('handleParsedChannelPerson');
  const channelPersonService = new ChannelPersonService(transactionalEntityManager);
  const channelPersonDtos = compatChannelPersonDtos(parsedFeed);
  await handleParsedManyData(channel, channelPersonService, channelPersonDtos);
  timerManager.end('handleParsedChannelPerson');
};
