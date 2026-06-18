import type { ActiveMQArtemisService } from '@queue/services/activeMQArtemis/index.js';
import type { MQFeedMessage } from '@queue/types/mq.js';

import type { PodcastIndexService } from '@podverse/external-services-podcast-index';
import type { MQQueueConfigFunctionParams } from '@podverse/helpers';
import type { ILoggerLike } from '@podverse/helpers-backend';
import { FeedService } from '@podverse/orm';
import type { ParseRSSFeedAndSaveToDatabaseOptions } from '@podverse/parser';

type MQRSSAddAllRecentlyUpdatedFeedsOptions = MQQueueConfigFunctionParams & {
  sinceRange: number;
  loggerService: ILoggerLike;
};

export const mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex = async (
  activeMQArtemisService: ActiveMQArtemisService,
  podcastIndexService: PodcastIndexService,
  options: MQRSSAddAllRecentlyUpdatedFeedsOptions,
  msgOptions: ParseRSSFeedAndSaveToDatabaseOptions
) => {
  const { sinceRange, loggerService } = options;
  const recentlyUpdatedFeeds = await podcastIndexService.recentGetData(sinceRange);

  await activeMQArtemisService.initialize();

  let enqueued = 0;
  let failed = 0;
  let skipped = 0;

  try {
    for (const feed of recentlyUpdatedFeeds) {
      const podcast_index_id = feed.feedId;

      try {
        const feedService = new FeedService();
        const dbFeed = await feedService.getByPodcastIndexId(podcast_index_id);

        if (!dbFeed) {
          skipped += 1;
          continue;
        }

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
        enqueued += 1;
      } catch (error) {
        failed += 1;
        loggerService.error(
          `[mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex] podcast_index_id=${podcast_index_id} failed:`,
          error
        );
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

  loggerService.info(
    `[mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex] Done. Enqueued: ${enqueued}, failed: ${failed}, skipped (not in db): ${skipped}, total feeds: ${recentlyUpdatedFeeds.length}.`
  );
};
