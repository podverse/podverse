import { FeedService } from '@podverse/orm';
import type { ActiveMQArtemisService } from '@queue/services/activeMQArtemis/index.js';
import type { MQFeedMessage } from '@queue/types/mq.js';
import type { MQQueueConfigFunctionParams } from '@podverse/helpers';
import type { ParseRSSFeedAndSaveToDatabaseOptions } from '@podverse/parser';

type MQRSSAddAllConfig = MQQueueConfigFunctionParams;

export const mqRSSAddAll = async (
  activeMQArtemisService: ActiveMQArtemisService,
  options: MQRSSAddAllConfig,
  msgOptions: ParseRSSFeedAndSaveToDatabaseOptions
) => {
  const feedService = new FeedService();
  const feeds = await feedService.getAll();

  await activeMQArtemisService.initialize();

  try {
    for (const feed of feeds) {
      const message: MQFeedMessage = {
        url: feed.url,
        podcast_index_id: feed.podcast_index_id,
        options: msgOptions,
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
