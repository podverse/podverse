import type { FeedObject } from 'podverse-partytime';
import type { Channel, EntityManager } from '@podverse/orm';
import { ChannelChatService } from '@podverse/orm';
import { compatChannelChatDto } from '@parser/lib/compat/partytime/channel.js';
import { handleParsedOneData } from '../base/handleParsedOneData.js';
import { timerManager } from '@parser/factories/timerManager.js';

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
