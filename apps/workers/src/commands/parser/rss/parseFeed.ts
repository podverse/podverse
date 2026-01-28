import { MQ_QUEUES } from '@podverse/helpers';
import { mqRSSAdd as mqRSSAddFunction } from '@podverse/mq';
import { parseRSSFeedAndSaveToDatabase } from '@podverse/parser';
import { CommandLineArgs } from '@workers/commands';
import { podcastIndexService } from '@workers/factories/podcastIndexService';
import { activeMQArtemisService } from '@workers/factories/activeMQArtemisService';

export const parserRSSParseFeed = async (args: CommandLineArgs) => {
  const podcast_index_id = Array.isArray(args.p) ? args.p[0] : args.p;
  if (!podcast_index_id) {
    throw new Error('podcast_index_id (-p) parameter is required');
  }

  if (isNaN(Number(podcast_index_id))) {
    throw new Error('podcast_index_id (-p) must be a number');
  }

  const feedData = await podcastIndexService.podcastGetById(Number(podcast_index_id));
  const feedUrl = feedData?.feed?.url;
  if (!feedUrl) {
    throw new Error(`No feedUrl found for podcast_index_id ${podcast_index_id}`);
  }

  const hasForceParse = typeof args.f !== 'undefined' || typeof args.forceParse !== 'undefined';
  const options = hasForceParse
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

  const result = await parseRSSFeedAndSaveToDatabase(feedUrl, Number(podcast_index_id), options);

  if (result && Array.isArray(result.remoteItemsToParse) && result.remoteItemsToParse.length > 0) {
    const mqConfig = MQ_QUEUES['rss-slow'];
    for (let i = 0; i < result.remoteItemsToParse.length; i++) {
      const item = result.remoteItemsToParse[i];
      if (!item) {
        continue;
      }
      const isLast = i === result.remoteItemsToParse.length - 1;
      try {
        await mqRSSAddFunction(
          activeMQArtemisService,
          {
            ...mqConfig,
            closeAfterSend: isLast,
            feedUrl: item.url,
            podcast_index_id: item.podcast_index_id,
          },
          item.options
        );
      } catch (err) {
        console.error('Error enqueueing remote item', err as Error);
      }
    }
  }
};
