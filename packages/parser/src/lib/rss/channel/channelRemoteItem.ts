import { FeedObject } from 'podverse-partytime';
import { Channel, ChannelRemoteItemService, EntityManager } from '@podverse/orm';
import { compatChannelRemoteItemDtos } from '@parser/lib/compat/partytime/channel';
import { handleParsedManyData } from '../base/handleParsedManyData';
import { timerManager } from '@parser/factories/timerManager';

export const handleParsedChannelRemoteItem = async (
  parsedFeed: FeedObject,
  channel: Channel,
  transactionalEntityManager?: EntityManager,
) => {
  timerManager.start('handleParsedChannelRemoteItem');
  const channelRemoteItemService = new ChannelRemoteItemService(transactionalEntityManager);
  const channelRemoteItemDtos = compatChannelRemoteItemDtos(parsedFeed);
  await handleParsedManyData(channel, channelRemoteItemService, channelRemoteItemDtos);
  timerManager.end('handleParsedChannelRemoteItem');
};
