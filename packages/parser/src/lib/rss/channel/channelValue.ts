import { timerManager } from '@parser/factories/timerManager.js';
import type { FeedObject } from 'podverse-partytime';

import type { Channel, EntityManager } from '@podverse/orm';
import {
  ChannelValueMetaBoostService,
  ChannelValueRecipientService,
  ChannelValueService,
} from '@podverse/orm';
import { compatChannelValueDtos } from '@podverse/parser-mapping';

export const handleParsedChannelValue = async (
  parsedFeed: FeedObject,
  channel: Channel,
  transactionalEntityManager?: EntityManager
) => {
  timerManager.start('handleParsedChannelValue');
  const channelValueService = new ChannelValueService(transactionalEntityManager);
  const channelValueDtos = compatChannelValueDtos(parsedFeed);
  const channelValueRecipientService = new ChannelValueRecipientService(transactionalEntityManager);
  const channelValueMetaBoostService = new ChannelValueMetaBoostService(transactionalEntityManager);

  if (channelValueDtos.length > 0) {
    for (const channelValueDto of channelValueDtos) {
      const channel_value = await channelValueService.update(
        channel,
        channelValueDto.channel_value
      );

      const channelValueMetaBoostDto = channelValueDto.channel_value_meta_boost;
      if (channelValueMetaBoostDto) {
        await channelValueMetaBoostService.update(channel_value, channelValueMetaBoostDto);
      } else {
        await channelValueMetaBoostService.delete(channel_value);
      }

      const channelValueRecipientDtos = channelValueDto.channel_value_recipients;
      if (channelValueRecipientDtos.length > 0) {
        for (const channelValueRecipientDto of channelValueRecipientDtos) {
          await channelValueRecipientService.update(channel_value, channelValueRecipientDto);
        }
      } else {
        await channelValueService.deleteAll(channel);
      }
    }
  } else {
    await channelValueService.deleteAll(channel);
  }
  timerManager.end('handleParsedChannelValue');
};
