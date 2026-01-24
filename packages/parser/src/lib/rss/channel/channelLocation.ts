import { FeedObject } from 'podverse-partytime';
import { Channel, ChannelLocationService, EntityManager } from '@podverse/orm';
import { compatChannelLocationDto } from '@parser/lib/compat/partytime/channel';
import { handleParsedOneData } from '../base/handleParsedOneData';
import { timerManager } from '@parser/factories/timerManager';

export const handleParsedChannelLocation = async (
  parsedFeed: FeedObject,
  channel: Channel,
  transactionalEntityManager?: EntityManager,
) => {
  timerManager.start('handleParsedChannelLocation');
  const channelLocationService = new ChannelLocationService(transactionalEntityManager);
  const channelLocationDtos = compatChannelLocationDto(parsedFeed);
  await handleParsedOneData(channel, channelLocationService, channelLocationDtos);
  timerManager.end('handleParsedChannelLocation');
};
