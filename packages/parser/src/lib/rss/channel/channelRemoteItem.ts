import { timerManager } from '@parser/factories/timerManager.js';
import type { FeedObject } from 'podverse-partytime';

import type { RemoteItemDto } from '@podverse/helpers';
import { filterInvalidFeedUuids } from '@podverse/helpers';
import type { Channel, EntityManager } from '@podverse/orm';
import { ChannelRemoteItemService } from '@podverse/orm';
import { compatChannelRemoteItemDtos } from '@podverse/parser-mapping';

import { listNewRemoteItemRefs } from '../../notifications/remoteAlbumNotification.js';
import { handleParsedManyData } from '../base/handleParsedManyData.js';

export const handleParsedChannelRemoteItem = async (
  parsedFeed: FeedObject,
  channel: Channel,
  transactionalEntityManager?: EntityManager
): Promise<RemoteItemDto[]> => {
  timerManager.start('handleParsedChannelRemoteItem');
  const channelRemoteItemService = new ChannelRemoteItemService(transactionalEntityManager);
  const channelRemoteItemDtos = filterInvalidFeedUuids(compatChannelRemoteItemDtos(parsedFeed));
  const existingRemoteItems = await channelRemoteItemService.getAll(channel);
  const newRemoteItems = listNewRemoteItemRefs(existingRemoteItems, channelRemoteItemDtos);
  await handleParsedManyData(channel, channelRemoteItemService, channelRemoteItemDtos);
  timerManager.end('handleParsedChannelRemoteItem');
  return newRemoteItems;
};
