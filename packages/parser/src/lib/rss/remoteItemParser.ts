import { config } from '@parser/config/index.js';
import { getPodcastIndexService } from '@parser/context.js';
import { loggerService } from '@parser/factories/loggerService.js';
import type { ParseRSSFeedAndSaveToDatabaseOptions } from '@parser/lib/rss/parser.js';
import { collectRemoteItemRefs } from '@parser/lib/rss/remoteItemRefs.js';

import {
  getOnDemandParserEventDateRange,
  ON_DEMAND_REMOTE_ITEM_PARSER_LIMIT,
  OnDemandParserEventType,
} from '@podverse/helpers';
import type { Channel } from '@podverse/orm';
import { ChannelService, FeedService, OnDemandParserEventService } from '@podverse/orm';

type PIFeedWithPodcastGuidData = {
  id: number;
  url: string;
};

export type OnDemandParserRemoteItemParams = {
  accountId: number | null;
  remoteParentPodcastIndexId: number;
};

type RemoteItemsQueueMessage = {
  url: string;
  podcast_index_id: number;
  options: ParseRSSFeedAndSaveToDatabaseOptions;
};

const handleRemoteItemsFeedParsing = async (
  feedGuidsToParse: string[],
  params: OnDemandParserRemoteItemParams
): Promise<RemoteItemsQueueMessage[]> => {
  const { accountId, remoteParentPodcastIndexId } = params;
  if (accountId) {
    const onDemandParserEventService = new OnDemandParserEventService();
    const count = await onDemandParserEventService.getCountByAccountIdAndTypeSince(
      accountId,
      OnDemandParserEventType.REMOTE_ITEM,
      getOnDemandParserEventDateRange()
    );
    if (count >= ON_DEMAND_REMOTE_ITEM_PARSER_LIMIT) {
      throw new Error('Monthly on-demand remote item feed parser limit reached');
    }
  }
  const piFeedDatas: PIFeedWithPodcastGuidData[] = [];
  for (const feedGuid of feedGuidsToParse) {
    const feedService = new FeedService();
    const pvExistingFeed = await feedService.getByPodcastGuid(feedGuid);

    if (!pvExistingFeed) {
      const podcastIndexServiceInstance = getPodcastIndexService();
      const piFeedDataResponse = await podcastIndexServiceInstance.podcastGetByGuid(
        feedGuid,
        config.podcastIndex?.rateLimitDelay ?? 0
      );
      if (piFeedDataResponse?.feed?.id && piFeedDataResponse?.feed?.url) {
        const piFeedData: PIFeedWithPodcastGuidData = {
          id: piFeedDataResponse.feed.id,
          url: piFeedDataResponse.feed.url,
        };
        piFeedDatas.push(piFeedData);
      }
    }
  }

  const queueMessages: RemoteItemsQueueMessage[] = [];
  for (const piFeedData of piFeedDatas) {
    const feedService = new FeedService();
    const feed = await feedService.getByUrlAndPodcastIndexId({
      url: piFeedData.url,
      podcast_index_id: piFeedData.id,
    });

    if (!feed) {
      loggerService.info(`handleRemoteItemsFeedParsing: ${piFeedData.url} ${piFeedData.id}`);
      queueMessages.push({
        url: piFeedData.url,
        podcast_index_id: piFeedData.id,
        options: {
          forceParse: false,
          onDemandParserEvent: {
            accountId,
            remoteParentPodcastIndexId,
            type: OnDemandParserEventType.REMOTE_ITEM,
          },
        },
      });
    }
  }

  return queueMessages;
};

/** Full recursive parse of every referenced feed Podcast Index knows; the opt-in remote item path. */
export const handleAllRemoteItemsFeedParsing = async (
  channel: Channel,
  params: OnDemandParserRemoteItemParams
): Promise<RemoteItemsQueueMessage[]> => {
  const channelService = new ChannelService();
  const latestChannel = await channelService.get(channel.id);
  if (!latestChannel) {
    return [];
  }

  const refs = await collectRemoteItemRefs(latestChannel);
  const seenGuids = new Set<string>();
  const feedGuids: string[] = [];
  for (const ref of refs) {
    const key = ref.feedGuid.toLowerCase();
    if (!seenGuids.has(key)) {
      seenGuids.add(key);
      feedGuids.push(ref.feedGuid);
    }
  }

  return handleRemoteItemsFeedParsing(feedGuids, params);
};
