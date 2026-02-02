import type { FeedObject } from 'podverse-partytime';
import type { Channel, EntityManager } from '@podverse/orm';
import { ChannelCategoryService } from '@podverse/orm';
import { compatChannelCategoryDtos } from '@parser/lib/compat/partytime/channel.js';
import { timerManager } from '@parser/factories/timerManager.js';

export const handleParsedChannelCategory = async (
  parsedFeed: FeedObject,
  channel: Channel,
  transactionalEntityManager?: EntityManager
) => {
  timerManager.start('handleParsedChannelCategory');
  const channelCategoryService = new ChannelCategoryService(transactionalEntityManager);
  const channelCategoryDtos = compatChannelCategoryDtos(parsedFeed);

  if (channelCategoryDtos.length > 0) {
    await channelCategoryService.updateMany(channel, channelCategoryDtos);
  } else {
    await channelCategoryService.deleteAll(channel);
  }
  timerManager.end('handleParsedChannelCategory');
};
