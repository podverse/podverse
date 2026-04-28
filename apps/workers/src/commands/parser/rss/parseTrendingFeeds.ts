import type { CommandLineArgs } from '@workers/commands/index.js';
import { getLoggerService } from '@workers/factories/loggerService.js';
import {
  collectTrendingFeedIds,
  DEFAULT_MAX_TRENDING_FEEDS,
  HARD_MAX_TRENDING_FEEDS,
  sleepRateLimit,
} from '@workers/lib/podcastIndex/collectTrendingFeedIds.js';

import { parsePodcastIndexFeedById } from './parseFeed.js';

const DEFAULT_MAX_FEEDS = DEFAULT_MAX_TRENDING_FEEDS;
const HARD_MAX_FEEDS = HARD_MAX_TRENDING_FEEDS;

export async function devParserRSSParseTrendingFeeds(args: CommandLineArgs) {
  const logger = getLoggerService();

  const rawMaxArg = 'max' in args ? args.max : 'n' in args ? args.n : undefined;
  const rawMax = Array.isArray(rawMaxArg) ? rawMaxArg[0] : rawMaxArg;
  let k = DEFAULT_MAX_FEEDS;
  if (rawMax !== undefined && rawMax !== '') {
    const parsed = parseInt(String(rawMax), 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      k = parsed;
    }
  }

  if (k > HARD_MAX_FEEDS) {
    logger.warn(
      `[devParserRSSParseTrendingFeeds] -max / -n ${k} is above the ${HARD_MAX_FEEDS} cap; using ${HARD_MAX_FEEDS}.`
    );
    k = HARD_MAX_FEEDS;
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

  const hasForceParse = typeof args.f !== 'undefined' || typeof args.forceParse !== 'undefined';

  logger.info(
    `[devParserRSSParseTrendingFeeds] Collecting up to ${k} trending feed ids (default ${DEFAULT_MAX_FEEDS}, cap ${HARD_MAX_FEEDS})...`
  );

  const feedIds = await collectTrendingFeedIds(k, initialSince, lang, cat);

  if (feedIds.length === 0) {
    logger.warn(
      '[devParserRSSParseTrendingFeeds] No feed ids returned from Podcast Index trending.'
    );
    return;
  }

  logger.info(
    `[devParserRSSParseTrendingFeeds] Parsing ${feedIds.length} feed(s) (requested K=${k}).`
  );

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < feedIds.length; i++) {
    if (i > 0) {
      await sleepRateLimit();
    }
    const id = feedIds[i];
    if (id === undefined) {
      continue;
    }
    try {
      await parsePodcastIndexFeedById(id, hasForceParse);
      succeeded += 1;
    } catch (error) {
      failed += 1;
      logger.error(
        `[devParserRSSParseTrendingFeeds] Feed podcast_index_id=${id} failed:`,
        error as Error
      );
    }
  }

  logger.info(
    `[devParserRSSParseTrendingFeeds] Done. Succeeded: ${succeeded}, failed: ${failed}, total: ${feedIds.length}.`
  );
}
