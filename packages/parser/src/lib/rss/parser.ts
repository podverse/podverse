import { config } from '@parser/config/index.js';
import { loggerService } from '@parser/factories/loggerService.js';
import { timerManager } from '@parser/factories/timerManager.js';
// import { handleNewItemsNotifications, handleNewLiveItemsNotifications } from '@parser/lib/notifications.js';
import { handleParsedChannel } from '@parser/lib/rss/channel/channel.js';
import { handleParsedChannelSeasons } from '@parser/lib/rss/channel/channelSeason.js';
import {
  handleGetRSSFeed,
  handleParsedFeed,
  handleRequestRSSFeed,
} from '@parser/lib/rss/feed/feed.js';
import type { HandleParsedItemsResult } from '@parser/lib/rss/item/item.js';
import { handleParsedItems } from '@parser/lib/rss/item/item.js';
import type { HandleParsedLiveItemsResult } from '@parser/lib/rss/liveItem/liveItem.js';
import { handleParsedLiveItems } from '@parser/lib/rss/liveItem/liveItem.js';
import { handleAllRemoteItemsFeedParsing } from '@parser/lib/rss/remoteItemParser.js';
import type { FeedObject } from 'podverse-partytime';
import { parseFeed } from 'podverse-partytime';

import type { ImageShrinkHint } from '@podverse/helpers';
import {
  getOnDemandParserEventDateRange,
  ON_DEMAND_ADD_PARSER_LIMIT,
  ON_DEMAND_REFRESH_PARSER_LIMIT,
  OnDemandParserEventType,
  sleep,
} from '@podverse/helpers';
import { getStatusCodeFromError } from '@podverse/helpers-requests';
import {
  AccountService,
  ChannelSeasonService,
  ChannelService,
  checkIfFeedFlagStatusShouldParse,
  checkIfSpamFeed,
  FeedFlagStatusStatusEnum,
  FeedLogService,
  FeedService,
  OnDemandParserEventService,
} from '@podverse/orm';
import { compatChannelImageDtos, compatItemImageDtos } from '@podverse/parser-mapping';

// import { firebaseAccessTokenServiceFactory } from '@parser/factories/firebaseAccessTokenService.js';
// import { NotificationsServiceFactory } from '@parser/factories/notificationsService.js';
import { _request } from '../_request.js';
import { handleNewItemNotifications } from '../notifications/handleNewItemNotifications.js';
import { handleNewLiveItemNotifications } from '../notifications/handleNewLiveItemNotifications.js';
import { FeedIsParsingError, FeedNoChangesSinceLastParsedError } from './errors.js';
import { getParsedFeedMd5Hash } from './hash/parsedFeed.js';

/*
  NOTE: All RSS feeds that have a podcast_index_id will be saved to the database.
  RSS feeds without podcast_index_id (Add By RSS feeds) will NOT be saved to the database.
*/

export const getAndParseRSSFeed = async (url: string) => {
  const response = await _request(url);
  const data = response.data as string;
  const parsedFeed = parseFeed(data, { allowMissingGuid: true });

  if (!parsedFeed) {
    throw new Error(`getAndParseRSSFeed: parsedFeed not found for ${url}`);
  }

  return parsedFeed;
};

export type ParseRSSOnDemandParserEvent = {
  accountId: number | null;
  remoteParentPodcastIndexId: number | null;
  type: OnDemandParserEventType | null;
};

export type ParseRSSFeedAndSaveToDatabaseOptions = {
  forceParse: boolean; // If true, will parse fully without checking for changes.
  onDemandParserEvent: ParseRSSOnDemandParserEvent;
};

export type ParseRSSFeedAndSaveToDatabaseResult = {
  remoteItemsToParse: {
    url: string;
    podcast_index_id: number;
    options: ParseRSSFeedAndSaveToDatabaseOptions;
  }[];
  imageHints: ImageShrinkHint[];
};

// Handle request delay for specific domains to avoid rate limiting
async function handleRateLimitRequestDelay(url: string) {
  const delayConfig = [{ regex: /^https?:\/\/(www\.)?wavlake\.com/, delay: 5000 }];

  for (const { regex, delay } of delayConfig) {
    if (regex.test(url)) {
      await sleep(delay);
      break;
    }
  }
}

export const parseRSSFeedAndSaveToDatabase = async (
  url: string,
  podcast_index_id: number,
  options: ParseRSSFeedAndSaveToDatabaseOptions
): Promise<ParseRSSFeedAndSaveToDatabaseResult> => {
  const { onDemandParserEvent } = options;
  const onDemandParserEventService = new OnDemandParserEventService();

  if (onDemandParserEvent) {
    const { accountId, type } = onDemandParserEvent;
    if (accountId && type) {
      if (type === OnDemandParserEventType.ADD) {
        const count = await onDemandParserEventService.getCountByAccountIdAndTypeSince(
          accountId,
          OnDemandParserEventType.ADD,
          getOnDemandParserEventDateRange()
        );
        if (count >= ON_DEMAND_ADD_PARSER_LIMIT) {
          throw new Error('Monthly on-demand add feed parser limit reached');
        }
      } else if (type === OnDemandParserEventType.REFRESH) {
        const count = await onDemandParserEventService.getCountByAccountIdAndTypeSince(
          accountId,
          OnDemandParserEventType.REFRESH,
          getOnDemandParserEventDateRange()
        );
        if (count >= ON_DEMAND_REFRESH_PARSER_LIMIT) {
          throw new Error('Monthly on-demand refresh feed parser limit reached');
        }
      }
    }
  }

  const feedService = new FeedService();
  let feed = null;
  let channel = null;

  const timerFullRunLabel = `parseRSSFeedAndSaveToDatabase ${url} ${podcast_index_id}`;
  timerManager.start(timerFullRunLabel);

  let parsedFeed: FeedObject | null = null;
  const imageHints: ImageShrinkHint[] = [];

  try {
    if (!url || !podcast_index_id) {
      throw new Error(
        `parseRSSFeedAndSaveToDatabase: url or podcast_index_id is missing for ${url} ${podcast_index_id}`
      );
    }

    await handleRateLimitRequestDelay(url);

    loggerService.info(
      `parseRSSFeedAndSaveToDatabase url: ${url} podcast_index_id: ${podcast_index_id}`
    );
    feed = await handleGetRSSFeed(url, podcast_index_id);

    if (!checkIfFeedFlagStatusShouldParse(feed.feed_flag_status.id)) {
      throw new Error(
        `parseRSSFeedAndSaveToDatabase: feed_flag_status.status is not Active or AlwaysAllow for ${feed.id} ${feed.podcast_index_id} ${feed.url}`
      );
    }

    parsedFeed = await handleRequestRSSFeed(feed);
    feed = await handleParsedFeed(parsedFeed, feed, options);
    // A race condition is possible. Save "is_parsing" state to valkey instead?
    await feedService.update(feed.id, { is_parsing: new Date() });

    if (checkIfSpamFeed(parsedFeed)) {
      await feedService.updateFlagStatus(feed, FeedFlagStatusStatusEnum.Spam);
      throw new Error(
        `parseRSSFeedAndSaveToDatabase: feed is spam ${feed.id} ${feed.podcast_index_id} ${feed.url}`
      );
    }

    const channelService = new ChannelService();
    channel = await channelService.getOrCreateByFeed(feed);

    await handleParsedChannelSeasons(parsedFeed, channel);
    const channelSeasonService = new ChannelSeasonService();
    const channelSeasonIndex = await channelSeasonService.getChannelSeasonIndex(channel);

    await handleParsedChannel(parsedFeed, channel, channelSeasonIndex);

    const hintCreatedAt = new Date().toISOString();
    const channelImageDtos = compatChannelImageDtos(parsedFeed);
    for (const image of channelImageDtos) {
      if (image.url) {
        imageHints.push({
          url: image.url,
          entityType: 'channel',
          hintCreatedAt,
        });
      }
    }

    loggerService.info(`item count: ${parsedFeed.items.length}`);

    const newItemIdentifiers: HandleParsedItemsResult = await handleParsedItems(
      parsedFeed.items,
      channel,
      channelSeasonIndex
    );
    for (const item of parsedFeed.items) {
      const itemImageDtos = compatItemImageDtos(item);
      for (const image of itemImageDtos) {
        if (image.url) {
          imageHints.push({
            url: image.url,
            entityType: 'item',
            hintCreatedAt,
          });
        }
      }
    }
    let newLiveItemIdentifiers: HandleParsedLiveItemsResult = {
      pendingItemGuids: [],
      liveItemGuids: [],
    };

    if (parsedFeed.podcastLiveItems) {
      newLiveItemIdentifiers = await handleParsedLiveItems(
        parsedFeed.podcastLiveItems,
        channel,
        channelSeasonIndex
      );
    }

    if (
      newItemIdentifiers.newItemGuids.length > 0 ||
      newItemIdentifiers.newItemGuidEnclosureUrls.length > 0
    ) {
      await handleNewItemNotifications(channel, newItemIdentifiers);
    }

    if (
      newLiveItemIdentifiers.pendingItemGuids.length > 0 ||
      newLiveItemIdentifiers.liveItemGuids.length > 0
    ) {
      await handleNewLiveItemNotifications(channel, newLiveItemIdentifiers);
    }

    const feedLogService = new FeedLogService();
    await feedLogService.update(feed, { last_finished_parse_time: new Date() });
  } catch (error) {
    if (error instanceof FeedIsParsingError) {
      loggerService.warn(`Feed ${feed?.id} is already parsing.`);
      // return so the is_parsing flag is not reset
      return { remoteItemsToParse: [], imageHints };
    } else if (error instanceof FeedNoChangesSinceLastParsedError) {
      loggerService.warn(`Feed ${feed?.id} has no changes since last parsed.`);
    } else {
      const statusCode = getStatusCodeFromError(error);
      if (feed) {
        const feedLogService = new FeedLogService();
        const feedLog = await feedLogService.get(feed);
        await feedLogService.update(feed, {
          ...(statusCode ? { last_http_status: statusCode } : {}),
          parse_errors: (feedLog?.parse_errors || 0) + 1,
        });
      }
      loggerService.logError('parseRSSFeedAndSaveToDatabase', error as Error);
    }
  } finally {
    loggerService.info(
      `Finished parsing channel: ${channel?.id} ${channel?.id_text} feed: ${feed?.id} url: ${url} podcast_index_id: ${podcast_index_id}`
    );
    timerManager.endAll();
    if (feed) {
      if (parsedFeed) {
        const currentFeedFileHash = getParsedFeedMd5Hash(parsedFeed);
        await feedService.update(feed.id, {
          is_parsing: null,
          last_parsed_file_hash: currentFeedFileHash,
        });
      }
    }

    if (onDemandParserEvent) {
      const { accountId, remoteParentPodcastIndexId, type } = onDemandParserEvent;
      if (accountId && type) {
        const accountService = new AccountService();
        const account = await accountService.get(accountId);
        if (account) {
          await onDemandParserEventService.create({
            account,
            podcastIndexId: podcast_index_id,
            remoteParentPodcastIndexId: remoteParentPodcastIndexId,
            type,
          });
        }
      }
    }
  }

  if (config.parser?.addRemoteItemsToMQ) {
    if (channel) {
      const remoteItems = await handleAllRemoteItemsFeedParsing(channel, {
        accountId: onDemandParserEvent?.accountId || null,
        remoteParentPodcastIndexId: podcast_index_id,
      });
      return { remoteItemsToParse: remoteItems, imageHints };
    }
  }

  return { remoteItemsToParse: [], imageHints };
};
