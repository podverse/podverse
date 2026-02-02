import { randomUUID } from 'node:crypto';

import { getRecordValue } from '@podverse/helpers';
import { AccountFollowingAddByRSSChannelService } from '@podverse/orm';
import type { ActiveMQArtemisService } from '@queue/services/activeMQArtemis/index.js';
import type { MQAddByRSSMessage } from '@queue/types/mq.js';
import type { MQQueueConfigFunctionParams } from '@podverse/helpers';

type MQAddByRSSAddAllConfig = MQQueueConfigFunctionParams & {
  accountId: number;
  feedHashesByUrl?: Record<string, string>;
  requestIdGenerator?: (feedUrl: string) => string;
};

export const mqAddByRSSAddAll = async (
  activeMQArtemisService: ActiveMQArtemisService,
  options: MQAddByRSSAddAllConfig
) => {
  const addByRSSChannelService = new AccountFollowingAddByRSSChannelService();
  const feeds = await addByRSSChannelService.getFollowedAddByRSSChannels(options.accountId);
  const getRequestId = options.requestIdGenerator ?? (() => randomUUID());

  await activeMQArtemisService.initialize();

  try {
    for (const feed of feeds) {
      const feedUrl = feed.feed_url;
      const feedHash = getRecordValue(options.feedHashesByUrl, feedUrl);
      const message: MQAddByRSSMessage = {
        accountId: options.accountId,
        feedUrl,
        requestId: getRequestId(feedUrl),
        feedHash,
      };

      await activeMQArtemisService.sendMessage({
        queueName: options.queueName,
        message,
        priority: options.priority,
        dedupeCacheTimeMS: options.dedupeCacheTimeMS,
      });
    }
  } finally {
    try {
      if (options.closeAfterSend) {
        await activeMQArtemisService.close();
      }
    } catch {
      // swallow
    }
  }
};
