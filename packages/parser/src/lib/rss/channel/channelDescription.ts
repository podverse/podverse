import { loggerService } from '@parser/factories/loggerService.js';
import { timerManager } from '@parser/factories/timerManager.js';
import type { DescriptionIngestContext } from '@parser/lib/rss/descriptionIngestContext.js';
import { recordPreparedDescription } from '@parser/lib/rss/descriptionIngestContext.js';
import type { FeedObject } from 'podverse-partytime/core';

import type { PreparedDescription } from '@podverse/helpers';
import type { Channel, EntityManager } from '@podverse/orm';
import { ChannelDescriptionService } from '@podverse/orm';
import { compatChannelDescriptionDto } from '@podverse/parser-mapping';

import { handleParsedOneData } from '../base/handleParsedOneData.js';

export const handleParsedChannelDescription = async (
  parsedFeed: FeedObject,
  channel: Channel,
  context: DescriptionIngestContext,
  transactionalEntityManager?: EntityManager
) => {
  timerManager.start('handleParsedChannelDescription');
  let channelDescriptionDto: PreparedDescription | null;
  try {
    channelDescriptionDto = compatChannelDescriptionDto(parsedFeed, context.tier);
  } catch (error) {
    // A description must never fail the parse; the stored row stays as it was.
    const reason = error instanceof Error ? error.message : String(error);
    loggerService.warn(`handleParsedChannelDescription: skipped channel ${channel.id}: ${reason}`);
    timerManager.end('handleParsedChannelDescription');
    return;
  }

  recordPreparedDescription(context, channelDescriptionDto);
  const channelDescriptionService = new ChannelDescriptionService(transactionalEntityManager);
  await handleParsedOneData(channel, channelDescriptionService, channelDescriptionDto);
  timerManager.end('handleParsedChannelDescription');
};
