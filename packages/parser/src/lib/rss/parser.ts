import { config } from '@parser/config/index.js';
import { getParserConfig, getPodcastIndexService } from '@parser/context.js';
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
  DEFAULT_HTTP_TIMEOUT_MS,
  getOnDemandParserEventDateRange,
  ON_DEMAND_ADD_PARSER_LIMIT,
  ON_DEMAND_REFRESH_PARSER_LIMIT,
  OnDemandParserEventType,
  resolveParserMaxFeedBodyBytes,
  sleep,
} from '@podverse/helpers';
import { getStatusCodeFromError, isTlsOrProtocolError } from '@podverse/helpers-requests';
import { canonicalHttpOrHttpsUrl } from '@podverse/helpers-validation';
import {
  AccountService,
  ChannelSeasonService,
  ChannelService,
  checkIfSpamFeed,
  DEFAULT_SPAM_FEED_ITEM_THRESHOLDS,
  FeedConditionSourceEnum,
  FeedConditionTypeKeyEnum,
  FeedLifecycleStateKeyEnum,
  FeedLogService,
  FeedPolicyService,
  FeedService,
  OnDemandParserEventService,
  resolveSpamFeedItemThresholds,
  shouldAttemptFeedParseFromLifecycleAndPolicy,
} from '@podverse/orm';
import { compatChannelImageDtos, compatItemImageDtos } from '@podverse/parser-mapping';

// import { firebaseAccessTokenServiceFactory } from '@parser/factories/firebaseAccessTokenService.js';
// import { NotificationsServiceFactory } from '@parser/factories/notificationsService.js';
import { _request } from '../_request.js';
import { handleNewItemNotifications } from '../notifications/handleNewItemNotifications.js';
import { handleNewLiveItemNotifications } from '../notifications/handleNewLiveItemNotifications.js';
import { FeedIsParsingError, FeedNoChangesSinceLastParsedError } from './errors.js';
import { getParsedFeedMd5Hash } from './hash/parsedFeed.js';
import { createParsedItemStableKeySet } from './itemStableKey.js';

/*
  NOTE: All RSS feeds that have a podcast_index_id will be saved to the database.
  RSS feeds without podcast_index_id (Add By RSS feeds) will NOT be saved to the database.
*/

export const getAndParseRSSFeed = async (url: string, maxFeedBodyBytes: number) => {
  const response = await _request(url, {
    maxResponseBytes: maxFeedBodyBytes,
  });
  const data = response.data as string;
  const bodyBytes = Buffer.byteLength(data, 'utf8');
  const parsedFeed = parseFeed(data, { allowMissingGuid: true, maxFeedBodyBytes });

  if (!parsedFeed) {
    if (bodyBytes > maxFeedBodyBytes) {
      throw new Error(
        `getAndParseRSSFeed: response body exceeds max (${bodyBytes} > ${maxFeedBodyBytes}) for ${url}`
      );
    }
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
  const delayConfig = [
    { regex: /^https?:\/\/(www\.)?wavlake\.com/, delay: DEFAULT_HTTP_TIMEOUT_MS },
  ];

  for (const { regex, delay } of delayConfig) {
    if (regex.test(url)) {
      await sleep(delay);
      break;
    }
  }
}

function isMaxResponseSizeError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('maxcontentlength') ||
    message.includes('maxbodylength') ||
    message.includes('response body exceeds max')
  );
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
  const feedPolicyService = new FeedPolicyService();
  const channelService = new ChannelService();
  let feed = null;
  let channel = null;
  let parsingLockAcquired = false;

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

    const canonicalUrl = canonicalHttpOrHttpsUrl(url);
    if (canonicalUrl === null) {
      throw new Error(`parseRSSFeedAndSaveToDatabase: invalid feed URL: ${url}`);
    }
    url = canonicalUrl;

    await handleRateLimitRequestDelay(url);

    loggerService.info(
      `parseRSSFeedAndSaveToDatabase url: ${url} podcast_index_id: ${podcast_index_id}`
    );
    feed = await handleGetRSSFeed(url, podcast_index_id);
    channel = await channelService.getOrCreateByFeed(feed);
    if (channel && !channel.title) {
      try {
        const podcastIndexService = getPodcastIndexService();
        const podcastIndexById = await podcastIndexService.podcastGetById(podcast_index_id);
        const piTitle = podcastIndexById?.feed?.title;
        if (typeof piTitle === 'string' && piTitle.trim()) {
          channel = await channelService.update(channel.id, {
            title: piTitle.trim(),
            sortable_title: piTitle.trim(),
            medium_id: channel.medium_id,
          });
        }
      } catch {
        // Best-effort PI metadata enrichment for minimally persisted channels.
      }
    }

    const currentFeedPolicy = await feedPolicyService.recomputePolicy(feed.id);
    const lifecycleKey =
      feed.feed_lifecycle_state?.feed_lifecycle_state_type?.state_key ??
      FeedLifecycleStateKeyEnum.Active;

    if (
      !shouldAttemptFeedParseFromLifecycleAndPolicy({
        lifecycleStateKey: lifecycleKey,
        feedPolicy: currentFeedPolicy,
      })
    ) {
      throw new Error(
        `parseRSSFeedAndSaveToDatabase: feed lifecycle/policy blocks parse for ${feed.id} ${feed.podcast_index_id} ${feed.url}`
      );
    }

    parsingLockAcquired = await feedService.tryStartParsing(feed.id);
    if (!parsingLockAcquired) {
      throw new FeedIsParsingError(feed.id);
    }

    if (feed.url !== url) {
      feed = await feedService.update(feed.id, { url });
    }

    const defaultMaxFeedBodyBytes = resolveParserMaxFeedBodyBytes(
      process.env.PARSER_MAX_FEED_BODY_BYTES
    );
    const maxFeedBodyBytes = feed.max_response_body_bytes_override ?? defaultMaxFeedBodyBytes;

    parsedFeed = await handleRequestRSSFeed(feed, maxFeedBodyBytes);
    await feedPolicyService.setCondition({
      feedId: feed.id,
      conditionKey: FeedConditionTypeKeyEnum.OversizedDetected,
      isActive: false,
      source: FeedConditionSourceEnum.Auto,
      note: null,
    });
    feed = await handleParsedFeed(parsedFeed, feed, options);

    const parserRuntimeSettings = getParserConfig().parser;
    const spamThresholds = parserRuntimeSettings
      ? {
          defaultLimit: parserRuntimeSettings.spamFeedItemThresholdDefault,
          spamPermittedLimit: parserRuntimeSettings.spamFeedItemThresholdSpamPermitted,
        }
      : DEFAULT_SPAM_FEED_ITEM_THRESHOLDS;
    const effectiveSpamThresholds = resolveSpamFeedItemThresholds(
      spamThresholds,
      feed.spam_item_limit_override
    );

    const activeConditionKeysBeforeSpamCheck = await feedPolicyService.getActiveConditionKeys(
      feed.id
    );

    if (checkIfSpamFeed(parsedFeed, activeConditionKeysBeforeSpamCheck, effectiveSpamThresholds)) {
      await feedPolicyService.setCondition({
        feedId: feed.id,
        conditionKey: FeedConditionTypeKeyEnum.SpamDetected,
        isActive: true,
        source: FeedConditionSourceEnum.Auto,
        note: 'Parser detected item/live-item count above configured spam threshold',
      });
      await feedService.refreshFeedPolicy(feed.id);
      throw new Error(
        `parseRSSFeedAndSaveToDatabase: feed is spam ${feed.id} ${feed.podcast_index_id} ${feed.url}`
      );
    }
    await feedPolicyService.setCondition({
      feedId: feed.id,
      conditionKey: FeedConditionTypeKeyEnum.SpamDetected,
      isActive: false,
      source: FeedConditionSourceEnum.Auto,
      note: null,
    });
    await feedService.refreshFeedPolicy(feed.id);

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

    const parsedItemStableKeys = createParsedItemStableKeySet(parsedFeed.items);

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
        channelSeasonIndex,
        parsedItemStableKeys
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
    if (feed?.id && isMaxResponseSizeError(error)) {
      await feedPolicyService.setCondition({
        feedId: feed.id,
        conditionKey: FeedConditionTypeKeyEnum.OversizedDetected,
        isActive: true,
        source: FeedConditionSourceEnum.Auto,
        note: 'Outbound response exceeded configured max response bytes',
      });
      await feedService.refreshFeedPolicy(feed.id);
    }

    if (error instanceof FeedIsParsingError) {
      // Lock loser must be a pure no-op: no parse writes, no feed-log writes, no on-demand event row.
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
      if (isTlsOrProtocolError(error)) {
        const tlsDetail = error instanceof Error ? error.message : String(error);
        loggerService.warn(
          `parseRSSFeedAndSaveToDatabase TLS/protocol error (feed skipped): ${url} podcast_index_id=${podcast_index_id} feed_id=${feed?.id ?? 'unknown'} — ${tlsDetail}`
        );
      } else {
        loggerService.logError('parseRSSFeedAndSaveToDatabase', error as Error);
      }
    }
  } finally {
    loggerService.info(
      `Finished parsing channel: ${channel?.id} ${channel?.id_text} feed: ${feed?.id} url: ${url} podcast_index_id: ${podcast_index_id}`
    );
    timerManager.endAll();
    if (feed && parsingLockAcquired) {
      const feedUpdateDto: {
        is_parsing: null;
        last_parsed_file_hash?: string;
      } = {
        is_parsing: null,
      };
      if (parsedFeed) {
        feedUpdateDto.last_parsed_file_hash = getParsedFeedMd5Hash(parsedFeed);
      }
      await feedService.update(feed.id, feedUpdateDto);
    }

    if (parsingLockAcquired && onDemandParserEvent) {
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
