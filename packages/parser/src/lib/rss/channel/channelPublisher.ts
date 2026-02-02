import type { FeedObject } from 'podverse-partytime';
import type { Channel, EntityManager } from '@podverse/orm';
import { ChannelPublisherService, ChannelPublisherRemoteItemService } from '@podverse/orm';
import { compatChannelPublisherRemoteItemDtos } from '@parser/lib/compat/partytime/channel.js';
import { timerManager } from '@parser/factories/timerManager.js';

export const handleParsedChannelPublisher = async (
  parsedFeed: FeedObject,
  channel: Channel,
  transactionalEntityManager?: EntityManager
) => {
  timerManager.start('handleParsedChannelPublisher');
  const channelPublisherService = new ChannelPublisherService(transactionalEntityManager);
  const channelPublisherDto = {};
  const channelPublisherRemoteItemService = new ChannelPublisherRemoteItemService(
    transactionalEntityManager
  );
  const channelPublisherRemoteItemDtos = compatChannelPublisherRemoteItemDtos(parsedFeed);

  if (channelPublisherRemoteItemDtos.length > 0) {
    const channel_publisher = await channelPublisherService.update(channel, channelPublisherDto);
    await channelPublisherRemoteItemService.updateMany(
      channel_publisher,
      channelPublisherRemoteItemDtos
    );
  } else {
    await channelPublisherService.delete(channel);
  }
  timerManager.end('handleParsedChannelPublisher');
};
