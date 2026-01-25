import { FeedService } from '@podverse/orm';
import { ActiveMQArtemisService } from '@queue/services/activeMQArtemis';
import { MQFeedMessage } from '@queue/types/mq';
import { MQQueueConfigFunctionParams } from '@podverse/helpers';
import { ParseRSSFeedAndSaveToDatabaseOptions } from '@podverse/parser';

type MQRSSAddAllConfig = MQQueueConfigFunctionParams;

export const mqRSSAddAll = async (
  activeMQArtemisService: ActiveMQArtemisService,
  options: MQRSSAddAllConfig,
  msgOptions: ParseRSSFeedAndSaveToDatabaseOptions,
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
