import { timerManager } from '@parser/factories/timerManager.js';

import type { Channel, EntityManager } from '@podverse/orm';
import { ChannelMetaBoostService } from '@podverse/orm';
import type { FeedObject } from '@podverse/parser-mapping';
import { compatChannelMetaBoost } from '@podverse/parser-mapping';

export const handleParsedChannelMetaBoost = async (
  parsedFeed: FeedObject,
  channel: Channel,
  transactionalEntityManager?: EntityManager
) => {
  timerManager.start('handleParsedChannelMetaBoost');
  const channelMetaBoostService = new ChannelMetaBoostService(transactionalEntityManager);
  const dto = compatChannelMetaBoost(parsedFeed.metaBoost);
  if (dto) {
    await channelMetaBoostService.update(channel, dto);
  } else {
    await channelMetaBoostService.delete(channel);
  }
  timerManager.end('handleParsedChannelMetaBoost');
};
