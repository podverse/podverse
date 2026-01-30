import { FeedObject } from 'podverse-partytime';
import { Channel, ChannelChatService, EntityManager } from '@podverse/orm';
import { compatChannelChatDto } from '@parser/lib/compat/partytime/channel';
import { handleParsedOneData } from '../base/handleParsedOneData';
import { timerManager } from '@parser/factories/timerManager';

export const handleParsedChannelChat = async (
  parsedFeed: FeedObject,
  channel: Channel,
  transactionalEntityManager?: EntityManager
) => {
  timerManager.start('handleParsedChannelChat');
  const channelChatService = new ChannelChatService(transactionalEntityManager);
  const channelChatDto = compatChannelChatDto(parsedFeed);
  await handleParsedOneData(channel, channelChatService, channelChatDto);
  timerManager.end('handleParsedChannelChat');
};
