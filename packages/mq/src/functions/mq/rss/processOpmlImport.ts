import type { ActiveMQArtemisService } from '@queue/services/activeMQArtemis/index.js';
import type { MQOpmlImportFeed } from '@queue/types/mq.js';

import {
  buildOpmlImportHourlyKey,
  type CacheGetJson,
  type CacheSetJson,
  emptyOpmlImportTotals,
  getOpmlImportHourBucket,
  getOpmlImportRetryAfterSeconds,
  incrementOpmlImportTotals,
  MQ_QUEUES,
  OnDemandParserEventType,
  type OpmlImportCacheEntry,
  type OpmlImportFeedOutcome,
  type OpmlImportPerFeedResult,
  setOpmlImportCacheEntry,
} from '@podverse/helpers';
import {
  AccountFollowingAddByRSSChannelService,
  AccountFollowingChannelService,
  AccountPendingFollowingChannelService,
  FeedService,
} from '@podverse/orm';

import { mqRSSAdd } from './add.js';
import { mqAddByRSSAdd } from './addByRSS.js';

export type ProcessOpmlImportJobParams = {
  accountId: number;
  requestId: string;
  feeds: MQOpmlImportFeed[];
  maxFeedsPerHour: number;
  cacheGetJson: CacheGetJson;
  cacheSetJson: CacheSetJson;
  activeMQArtemisService: ActiveMQArtemisService;
  podcastGetByFeedUrl: (
    feedUrl: string
  ) => Promise<{ podcast_index_id?: number | null; feedId?: number | null } | null>;
  /** When false, skip MQ enqueues (E2E fixtures / sync API path). Default true. */
  enqueueDownstreamJobs?: boolean;
};

type HourlyCounter = { count: number };

const getHourlyCount = async (
  cacheGetJson: CacheGetJson,
  accountId: number,
  nowMs: number
): Promise<number> => {
  const key = buildOpmlImportHourlyKey(accountId, getOpmlImportHourBucket(nowMs));
  const entry = await cacheGetJson<HourlyCounter>(key);
  return entry?.count ?? 0;
};

const incrementHourlyCount = async (
  cacheGetJson: CacheGetJson,
  cacheSetJson: CacheSetJson,
  accountId: number,
  nowMs: number
): Promise<void> => {
  const key = buildOpmlImportHourlyKey(accountId, getOpmlImportHourBucket(nowMs));
  const entry = await cacheGetJson<HourlyCounter>(key);
  const count = (entry?.count ?? 0) + 1;
  await cacheSetJson(key, { count }, 3600);
};

const persistEntry = async (
  cacheSetJson: CacheSetJson,
  entry: OpmlImportCacheEntry
): Promise<void> => {
  await setOpmlImportCacheEntry(cacheSetJson, {
    ...entry,
    updatedAt: new Date().toISOString(),
  });
};

export const processOpmlImportJob = async (
  params: ProcessOpmlImportJobParams
): Promise<OpmlImportCacheEntry> => {
  const {
    accountId,
    requestId,
    feeds,
    maxFeedsPerHour,
    cacheGetJson,
    cacheSetJson,
    activeMQArtemisService,
    podcastGetByFeedUrl,
  } = params;
  const enqueueDownstreamJobs = params.enqueueDownstreamJobs !== false;

  const feedService = new FeedService();
  const followingChannelService = new AccountFollowingChannelService();
  const followingAddByRSSChannelService = new AccountFollowingAddByRSSChannelService();
  const pendingFollowingChannelService = new AccountPendingFollowingChannelService();

  let entry: OpmlImportCacheEntry = {
    requestId,
    accountId,
    status: 'processing',
    totals: emptyOpmlImportTotals(feeds.length),
    results: [],
    updatedAt: new Date().toISOString(),
  };
  await persistEntry(cacheSetJson, entry);

  const nowMs = Date.now();
  let remainingBudget = Math.max(
    0,
    maxFeedsPerHour - (await getHourlyCount(cacheGetJson, accountId, nowMs))
  );
  let rateLimitedInfo = entry.rateLimited;

  for (const feed of feeds) {
    let outcome: OpmlImportFeedOutcome;
    let error: string | undefined;

    try {
      const existingFeed = await feedService.getByUrl({ url: feed.feedUrl });
      if (existingFeed?.channel?.id_text) {
        const alreadyFollowed = await followingChannelService.hasFollowedChannel(
          accountId,
          existingFeed.channel.id_text
        );
        if (alreadyFollowed) {
          outcome = 'already_subscribed';
        } else {
          await followingChannelService.followChannel(accountId, existingFeed.channel.id_text);
          outcome = 'subscribed';
        }
      } else {
        const alreadyAddByRss = await followingAddByRSSChannelService.hasFollowedAddByRSSChannel(
          accountId,
          feed.feedUrl
        );
        if (alreadyAddByRss) {
          outcome = 'already_subscribed';
        } else if (remainingBudget <= 0) {
          outcome = 'rate_limited';
          rateLimitedInfo = {
            limit: maxFeedsPerHour,
            retryAfterSeconds: getOpmlImportRetryAfterSeconds(nowMs),
          };
        } else {
          const piFeed = await podcastGetByFeedUrl(feed.feedUrl);
          const podcastIndexId =
            typeof piFeed?.podcast_index_id === 'number'
              ? piFeed.podcast_index_id
              : typeof piFeed?.feedId === 'number'
                ? piFeed.feedId
                : null;

          if (podcastIndexId !== null) {
            await pendingFollowingChannelService.addPendingFollow(accountId, {
              podcast_index_id: podcastIndexId,
              feed_url: feed.feedUrl,
            });
            if (enqueueDownstreamJobs) {
              await mqRSSAdd(
                activeMQArtemisService,
                {
                  ...MQ_QUEUES['rss-on-demand'],
                  feedUrl: feed.feedUrl,
                  podcast_index_id: podcastIndexId,
                  closeAfterSend: false,
                },
                {
                  forceParse: false,
                  onDemandParserEvent: {
                    accountId,
                    remoteParentPodcastIndexId: null,
                    type: OnDemandParserEventType.ADD,
                  },
                }
              );
            }
            outcome = 'enqueued_indexed';
          } else {
            await followingAddByRSSChannelService.addOrUpdateRSSChannel(accountId, {
              feed_url: feed.feedUrl,
              title: feed.title ?? null,
            });
            if (enqueueDownstreamJobs) {
              await mqAddByRSSAdd(activeMQArtemisService, {
                ...MQ_QUEUES['add-by-rss-on-demand'],
                accountId,
                feedUrl: feed.feedUrl,
                requestId: `${requestId}:${feed.feedUrl}`,
                closeAfterSend: false,
              });
            }
            outcome = 'added_by_rss';
          }

          remainingBudget -= 1;
          await incrementHourlyCount(cacheGetJson, cacheSetJson, accountId, nowMs);
        }
      }
    } catch (feedError) {
      outcome = 'failed';
      error = feedError instanceof Error ? feedError.message : String(feedError);
    }

    const result: OpmlImportPerFeedResult = {
      feedUrl: feed.feedUrl,
      outcome,
      ...(feed.title !== undefined ? { title: feed.title } : {}),
      ...(error !== undefined ? { error } : {}),
    };
    entry = {
      ...entry,
      status: 'processing',
      totals: incrementOpmlImportTotals(entry.totals, outcome),
      results: [...entry.results, result],
      ...(rateLimitedInfo !== undefined ? { rateLimited: rateLimitedInfo } : {}),
    };
    await persistEntry(cacheSetJson, entry);
  }

  entry = {
    ...entry,
    status: 'completed',
    ...(rateLimitedInfo !== undefined ? { rateLimited: rateLimitedInfo } : {}),
  };
  await persistEntry(cacheSetJson, entry);
  return entry;
};
