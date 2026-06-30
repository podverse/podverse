import type { CommandLineArgs } from '@workers/commands/index.js';
import { getActiveMQArtemisService } from '@workers/factories/activeMQArtemisService.js';
import { getLoggerService } from '@workers/factories/loggerService.js';
import { getPodcastIndexService } from '@workers/factories/podcastIndexService.js';
import {
  collectTrendingFeedIds,
  DEFAULT_MAX_TRENDING_FEEDS,
  HARD_MAX_TRENDING_FEEDS,
  sleepRateLimit,
} from '@workers/lib/podcastIndex/collectTrendingFeedIds.js';

import type { MQQueueNameParamKey } from '@podverse/helpers';
import { MQ_QUEUES, validMQQueueNamesParamKeys } from '@podverse/helpers';
import { mqRSSAdd as mqRSSAddFunction } from '@podverse/mq';

export const mqRSSAddTrendingPodcastsFromPodcastIndex = async (args: CommandLineArgs) => {
  const logger = getLoggerService();

  const qRaw = 'q' in args ? (Array.isArray(args.q) ? args.q[0] : args.q) : undefined;
  const mqQueueNameParamKey = String(qRaw !== undefined && qRaw !== '' ? qRaw : 'rss-normal') as
    MQQueueNameParamKey | string;

  if (!validMQQueueNamesParamKeys.includes(mqQueueNameParamKey as MQQueueNameParamKey)) {
    throw new Error(
      `Invalid queueName (-q). Allowed values are: ${validMQQueueNamesParamKeys.join(', ')}`
    );
  }

  const key = mqQueueNameParamKey as MQQueueNameParamKey;
  const rawMaxArg = 'max' in args ? args.max : 'n' in args ? args.n : undefined;
  const rawMax = Array.isArray(rawMaxArg) ? rawMaxArg[0] : rawMaxArg;
  let k = DEFAULT_MAX_TRENDING_FEEDS;
  if (rawMax !== undefined && rawMax !== '') {
    const parsed = parseInt(String(rawMax), 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      k = parsed;
    }
  }

  if (k > HARD_MAX_TRENDING_FEEDS) {
    logger.warn(
      `[mqRSSAddTrendingPodcastsFromPodcastIndex] -max / -n ${k} is above the ${HARD_MAX_TRENDING_FEEDS} cap; using ${HARD_MAX_TRENDING_FEEDS}.`
    );
    k = HARD_MAX_TRENDING_FEEDS;
  }

  let initialSince: number | undefined;
  if ('since' in args) {
    const raw = Array.isArray(args.since) ? args.since[0] : args.since;
    const parsed = parseInt(String(raw ?? ''), 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      initialSince = parsed;
    }
  }

  const lang = 'lang' in args ? (Array.isArray(args.lang) ? args.lang[0] : args.lang) : undefined;
  const cat = 'cat' in args ? (Array.isArray(args.cat) ? args.cat[0] : args.cat) : undefined;
  const forceParse = args.f === '';

  logger.info(
    `[mqRSSAddTrendingPodcastsFromPodcastIndex] Collecting up to ${k} trending feed ids, queue ${key} (default ${DEFAULT_MAX_TRENDING_FEEDS}, cap ${HARD_MAX_TRENDING_FEEDS})...`
  );

  const feedIds = await collectTrendingFeedIds(k, initialSince, lang, cat);

  if (feedIds.length === 0) {
    logger.warn(
      '[mqRSSAddTrendingPodcastsFromPodcastIndex] No feed ids returned from Podcast Index trending.'
    );
    return;
  }

  const mqConstantMessageOptions = MQ_QUEUES[key];
  const artemis = getActiveMQArtemisService();
  const podcastIndex = getPodcastIndexService();

  let enqueued = 0;
  let failed = 0;
  let skipped = 0;

  try {
    for (let i = 0; i < feedIds.length; i++) {
      if (i > 0) {
        await sleepRateLimit();
      }
      const id = feedIds[i];
      if (id === undefined) {
        continue;
      }
      try {
        const feedData = await podcastIndex.podcastGetById(id);
        const feedUrl = feedData?.feed?.url;
        if (!feedUrl) {
          skipped += 1;
          logger.warn(
            `[mqRSSAddTrendingPodcastsFromPodcastIndex] No feedUrl for podcast_index_id=${id}, skipping.`
          );
          continue;
        }
        await mqRSSAddFunction(
          artemis,
          {
            ...mqConstantMessageOptions,
            feedUrl,
            podcast_index_id: id,
            closeAfterSend: false,
          },
          {
            forceParse,
            onDemandParserEvent: {
              accountId: null,
              type: null,
              remoteParentPodcastIndexId: null,
            },
          }
        );
        enqueued += 1;
      } catch (error) {
        failed += 1;
        logger.error(
          `[mqRSSAddTrendingPodcastsFromPodcastIndex] podcast_index_id=${id} failed:`,
          error as Error
        );
      }
    }
  } finally {
    try {
      await artemis.close();
    } catch {
      // swallow
    }
  }

  logger.info(
    `[mqRSSAddTrendingPodcastsFromPodcastIndex] Done. Enqueued: ${enqueued}, failed: ${failed}, skipped (no url): ${skipped}, total ids: ${feedIds.length}.`
  );
};
