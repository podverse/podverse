import { OnDemandParserEventType, ON_DEMAND_REMOTE_ITEM_PARSER_LIMIT,
  getOnDemandParserEventDateRange } from '@podverse/helpers';
import {
  Channel,
  ChannelPodrollRemoteItemService,
  ChannelPodrollService,
  ChannelPublisherRemoteItemService,
  ChannelPublisherService,
  ChannelRemoteItemService,
  ChannelService,
  FeedService,
  ItemService,
  OnDemandParserEventService,
} from '@podverse/orm';
import { podcastIndexService } from '@parser/factories/podcastIndex';
import type { ParseRSSFeedAndSaveToDatabaseOptions } from '@parser/lib/rss/parser';
import { loggerService } from '@parser/factories/loggerService';
import { config } from '@parser/config';

type PIFeedWithPodcastGuidData = {
  id: number;
  url: string;
}

export type OnDemandParserRemoteItemParams = {
  accountId: number | null;
  remoteParentPodcastIndexId: number;
}

type RemoteItemsQueueMessage = {
  url: string;
  podcast_index_id: number;
  options: ParseRSSFeedAndSaveToDatabaseOptions;
}

const handleRemoteItemsFeedParsing = async (feedGuidsToParse: string[], params: OnDemandParserRemoteItemParams): Promise<RemoteItemsQueueMessage[]> => {
  const { accountId, remoteParentPodcastIndexId } = params;
  if (accountId) {
    const onDemandParserEventService = new OnDemandParserEventService();
    const count = await onDemandParserEventService.getCountByAccountIdAndTypeSince(
      accountId,
      OnDemandParserEventType.REMOTE_ITEM,
      getOnDemandParserEventDateRange(),
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
      const piFeedDataResponse = await podcastIndexService.podcastGetByGuid(feedGuid, config.podcastIndex.rateLimitDelay);
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

export const handleAllRemoteItemsFeedParsing = async (channel: Channel, params: OnDemandParserRemoteItemParams): Promise<RemoteItemsQueueMessage[]> => {
  const channelService = new ChannelService();
  const latestChannel = await channelService.get(channel.id);
  if (!latestChannel) {
    return [];
  }
  const results: RemoteItemsQueueMessage[] = [];
  const podrollResults = await handleRemoteItemsPodrollParsing(latestChannel, params);
  const publisherResults = await handleRemoteItemsPublisherParsing(latestChannel, params);
  const channelResults = await handleRemoteItemsChannelParsing(latestChannel, params);
  const timeSplitResults = await handleRemoteItemsItemValueTimeSplitParsing(latestChannel, params);

  results.push(...podrollResults, ...publisherResults, ...channelResults, ...timeSplitResults);
  return results;
};

const handleRemoteItemsPodrollParsing = async (channel: Channel, params: OnDemandParserRemoteItemParams): Promise<RemoteItemsQueueMessage[]> => {
  const channelPodrollService = new ChannelPodrollService();
  const channelPodroll = await channelPodrollService.get(channel);
  if (channelPodroll) {
    const channelPodrollRemoteItemService = new ChannelPodrollRemoteItemService();
    const channelPodrollRemoteItems = await channelPodrollRemoteItemService.getAll(channelPodroll);
    const feedGuidsToParse = channelPodrollRemoteItems.map(remoteItem => remoteItem.feed_guid);
    return await handleRemoteItemsFeedParsing(feedGuidsToParse, params);
  }

  return [];
};

const handleRemoteItemsPublisherParsing = async (channel: Channel, params: OnDemandParserRemoteItemParams): Promise<RemoteItemsQueueMessage[]> => {
  const channelPublisherService = new ChannelPublisherService();
  const channelPublisher = await channelPublisherService.get(channel);
  if (channelPublisher) {
    const channelPublisherRemoteItemService = new ChannelPublisherRemoteItemService();
    const channelPublisherRemoteItems = await channelPublisherRemoteItemService.getAll(channelPublisher);
    const feedGuidsToParse = channelPublisherRemoteItems.map(remoteItem => remoteItem.feed_guid);
    return await handleRemoteItemsFeedParsing(feedGuidsToParse, params);
  }

  return [];
};

const handleRemoteItemsChannelParsing = async (channel: Channel, params: OnDemandParserRemoteItemParams): Promise<RemoteItemsQueueMessage[]> => {
  const channelRemoteItemService = new ChannelRemoteItemService();
  const channelRemoteItems = await channelRemoteItemService.getAll(channel);
  const feedGuidsToParse = channelRemoteItems.map(remoteItem => remoteItem.feed_guid);
  return await handleRemoteItemsFeedParsing(feedGuidsToParse, params);
};

const handleRemoteItemsItemValueTimeSplitParsing = async (channel: Channel, params: OnDemandParserRemoteItemParams): Promise<RemoteItemsQueueMessage[]> => {
  if (channel.has_value_time_splits) {
    const itemService = new ItemService();
    const items = await itemService.getManyByChannel(channel, {
      relations: [
        'item_values',
        'item_values.item_value_time_splits',
        'item_values.item_value_time_splits.item_value_time_split_recipients',
        'item_values.item_value_time_splits.item_value_time_split_remote_item',
      ],
    });
    const results: RemoteItemsQueueMessage[] = [];
    for (const item of items) {
      if (item) {
        if (item.item_values?.length > 0) {
          for (const itemValue of item.item_values) {
            if (itemValue.item_value_time_splits?.length > 0) {
              for (const itemValueTimeSplit of itemValue.item_value_time_splits) {
                if (itemValueTimeSplit.item_value_time_split_remote_item) {
                  const feedGuid = itemValueTimeSplit.item_value_time_split_remote_item.feed_guid;
                  const res = await handleRemoteItemsFeedParsing([feedGuid], params);
                  if (res && res.length > 0) {
                    results.push(...res);
                  }
                }
              }
            }
          }
        }
      }   
    }

    return results;
  }

  return [];
};
