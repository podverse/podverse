import { timerManager } from '@parser/factories/timerManager.js';
import type { FeedObject } from 'podverse-partytime';

import type { Channel, EntityManager } from '@podverse/orm';
import { ChannelRemoteItemService } from '@podverse/orm';
import { compatChannelRemoteItemDtos } from '@podverse/parser-mapping';

import { handleParsedManyData } from '../base/handleParsedManyData.js';

export const handleParsedChannelRemoteItem = async (
  parsedFeed: FeedObject,
  channel: Channel,
  transactionalEntityManager?: EntityManager
) => {
  timerManager.start('handleParsedChannelRemoteItem');
  const channelRemoteItemService = new ChannelRemoteItemService(transactionalEntityManager);
  const channelRemoteItemDtos = compatChannelRemoteItemDtos(parsedFeed);
  await handleParsedManyData(channel, channelRemoteItemService, channelRemoteItemDtos);
  timerManager.end('handleParsedChannelRemoteItem');
};
