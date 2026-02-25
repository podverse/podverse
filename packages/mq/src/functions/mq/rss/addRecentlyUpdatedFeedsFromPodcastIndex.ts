import type { PodcastIndexService } from '@podverse/external-services-podcast-index';
import type { MQQueueConfigFunctionParams } from '@podverse/helpers';
import { FeedService } from '@podverse/orm';
import type { ActiveMQArtemisService } from '@queue/services/activeMQArtemis/index.js';
import type { MQFeedMessage } from '@queue/types/mq.js';
import type { ParseRSSFeedAndSaveToDatabaseOptions } from '@podverse/parser';

type MQRSSAddAllRecentlyUpdatedFeedsOptions = MQQueueConfigFunctionParams & {
  sinceRange: number;
};

export const mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex = async (
  activeMQArtemisService: ActiveMQArtemisService,
  podcastIndexService: PodcastIndexService,
  options: MQRSSAddAllRecentlyUpdatedFeedsOptions,
  msgOptions: ParseRSSFeedAndSaveToDatabaseOptions
) => {
  const sinceRange = options.sinceRange;
  const recentlyUpdatedFeeds = await podcastIndexService.recentGetData(sinceRange);

  await activeMQArtemisService.initialize();

  try {
    for (const feed of recentlyUpdatedFeeds) {
      const feedService = new FeedService();
      const podcast_index_id = feed.feedId;
      const dbFeed = await feedService.getByPodcastIndexId(podcast_index_id);
      const shouldAddToQueue = !!dbFeed;

      if (shouldAddToQueue) {
        const message: MQFeedMessage = {
          url: feed.feedUrl,
          podcast_index_id: feed.feedId,
          options: msgOptions,
        };

        await activeMQArtemisService.sendMessage({
          queueName: options.queueName,
          message,
          priority: options.priority,
          dedupeCacheTimeMS: options.dedupeCacheTimeMS,
        });
      }
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
