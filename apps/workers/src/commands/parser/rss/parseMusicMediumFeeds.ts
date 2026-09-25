import type { CommandLineArgs } from '@workers/commands/index.js';
import { getLoggerService } from '@workers/factories/loggerService.js';
import {
  collectMusicMediumFeedIds,
  DEFAULT_MAX_MUSIC_MEDIUM_FEEDS,
  HARD_MAX_MUSIC_MEDIUM_FEEDS,
} from '@workers/lib/podcastIndex/collectMusicMediumFeedIds.js';
import { sleepRateLimit } from '@workers/lib/podcastIndex/collectTrendingFeedIds.js';

import { parsePodcastIndexFeedById } from './parseFeed.js';

const DEFAULT_MAX_FEEDS = DEFAULT_MAX_MUSIC_MEDIUM_FEEDS;
const HARD_MAX_FEEDS = HARD_MAX_MUSIC_MEDIUM_FEEDS;

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export async function devParserRSSParseMusicMediumFeeds(args: CommandLineArgs) {
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
      `[devParserRSSParseMusicMediumFeeds] -max / -n ${k} is above the ${HARD_MAX_FEEDS} cap; using ${HARD_MAX_FEEDS}.`
    );
    k = HARD_MAX_FEEDS;
  }

  const hasForceParse = typeof args.f !== 'undefined' || typeof args.forceParse !== 'undefined';

  logger.info(
    `[devParserRSSParseMusicMediumFeeds] Collecting up to ${k} music-medium feed ids (default ${DEFAULT_MAX_FEEDS}, cap ${HARD_MAX_FEEDS})...`
  );

  const feedIds = await collectMusicMediumFeedIds(k);

  if (feedIds.length === 0) {
    logger.warn(
      '[devParserRSSParseMusicMediumFeeds] No feed ids returned from Podcast Index bymedium=music.'
    );
    return;
  }

  logger.info(
    `[devParserRSSParseMusicMediumFeeds] Parsing ${feedIds.length} feed(s) (requested K=${k}).`
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
        `[devParserRSSParseMusicMediumFeeds] Feed podcast_index_id=${id} failed:`,
        normalizeError(error)
      );
    }
  }

  logger.info(
    `[devParserRSSParseMusicMediumFeeds] Done. Succeeded: ${succeeded}, failed: ${failed}, total: ${feedIds.length}.`
  );
}
