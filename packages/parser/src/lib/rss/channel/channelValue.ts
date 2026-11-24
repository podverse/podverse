import { timerManager } from '@parser/factories/timerManager.js';
import type { FeedObject } from 'podverse-partytime/core';

import type { Channel, EntityManager } from '@podverse/orm';
import { ChannelValueRecipientService, ChannelValueService } from '@podverse/orm';
import { compatChannelValueDtos } from '@podverse/parser-mapping';

export const handleParsedChannelValue = async (
  parsedFeed: FeedObject,
  channel: Channel,
  transactionalEntityManager?: EntityManager
) => {
  timerManager.start('handleParsedChannelValue');
  try {
    const channelValueService = new ChannelValueService(transactionalEntityManager);
    const channelValueDtos = compatChannelValueDtos(parsedFeed);

    if (channelValueDtos.length === 0) {
      await channelValueService.deleteAll(channel);
      return;
    }

    const savedValues = await channelValueService.updateMany(
      channel,
      channelValueDtos.map((channelValueDto) => channelValueDto.channel_value)
    );
    const channelValueRecipientService = new ChannelValueRecipientService(
      transactionalEntityManager
    );

    for (const channelValueDto of channelValueDtos) {
      const channel_value = savedValues.find(
        (saved) =>
          saved.type === channelValueDto.channel_value.type &&
          saved.method === channelValueDto.channel_value.method
      );
      if (channel_value === undefined) {
        continue;
      }
      await channelValueRecipientService.updateMany(
        channel_value,
        channelValueDto.channel_value_recipients
      );
    }
  } finally {
    timerManager.end('handleParsedChannelValue');
  }
};
