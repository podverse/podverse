import type { CommandLineArgs } from '@workers/commands/index.js';
import { getActiveMQArtemisService } from '@workers/factories/activeMQArtemisService.js';
import { getPodcastIndexService } from '@workers/factories/podcastIndexService.js';

import { hasImageHints, MQ_IMAGE_SHRINK_HINTS_CONFIG, MQ_QUEUES } from '@podverse/helpers';
import { mqImageShrinkHintAdd, mqRSSAdd as mqRSSAddFunction } from '@podverse/mq';
import { parseRSSFeedAndSaveToDatabase } from '@podverse/parser';

/**
 * Fetches the feed URL from the Podcast Index, parses the RSS, persists to the DB, and
 * enqueues follow-up MQ work (remote items, image hints). Used by `parserRSSParseFeed` and
 * dev/bulk commands such as `devParserRSSParseTrendingFeeds`.
 */
export async function parsePodcastIndexFeedById(
  podcastIndexId: number,
  forceParse: boolean
): Promise<void> {
  const feedData = await getPodcastIndexService().podcastGetById(podcastIndexId);
  const feedUrl = feedData?.feed?.url;
  if (!feedUrl) {
    throw new Error(`No feedUrl found for podcast_index_id ${podcastIndexId}`);
  }

  const options = forceParse
    ? {
        forceParse: true,
        onDemandParserEvent: {
          accountId: null,
          type: null,
          remoteParentPodcastIndexId: null,
        },
      }
    : {
        forceParse: false,
        onDemandParserEvent: {
          accountId: null,
          type: null,
          remoteParentPodcastIndexId: null,
        },
      };

  const result = await parseRSSFeedAndSaveToDatabase(feedUrl, podcastIndexId, options);

  const activeMQArtemisService = getActiveMQArtemisService();
  let sentMessages = 0;

  if (result && Array.isArray(result.remoteItemsToParse) && result.remoteItemsToParse.length > 0) {
    const mqConfig = MQ_QUEUES['rss-slow'];
    for (let i = 0; i < result.remoteItemsToParse.length; i++) {
      const item = result.remoteItemsToParse[i];
      if (!item) {
        continue;
      }
      try {
        await mqRSSAddFunction(
          activeMQArtemisService,
          {
            ...mqConfig,
            closeAfterSend: false,
            feedUrl: item.url,
            podcast_index_id: item.podcast_index_id,
          },
          item.options
        );
        sentMessages += 1;
      } catch (err) {
        console.error('Error enqueueing remote item', err as Error);
      }
    }
  }

  if (hasImageHints(result) && result.imageHints.length > 0) {
    for (const hint of result.imageHints) {
      if (!hint) {
        continue;
      }
      try {
        await mqImageShrinkHintAdd(
          activeMQArtemisService,
          {
            ...MQ_IMAGE_SHRINK_HINTS_CONFIG,
            closeAfterSend: false,
          },
          hint
        );
        sentMessages += 1;
      } catch (err) {
        console.error('Error enqueueing image shrink hint', err as Error);
      }
    }
  }

  if (sentMessages > 0) {
    await activeMQArtemisService.close();
  }
}

export const parserRSSParseFeed = async (args: CommandLineArgs) => {
  const podcast_index_id = Array.isArray(args.p) ? args.p[0] : args.p;
  if (!podcast_index_id) {
    throw new Error('podcast_index_id (-p) parameter is required');
  }

  if (isNaN(Number(podcast_index_id))) {
    throw new Error('podcast_index_id (-p) must be a number');
  }

  const hasForceParse = typeof args.f !== 'undefined' || typeof args.forceParse !== 'undefined';
  await parsePodcastIndexFeedById(Number(podcast_index_id), hasForceParse);
};
