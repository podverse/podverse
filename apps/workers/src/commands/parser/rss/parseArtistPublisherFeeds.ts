import type { CommandLineArgs } from '@workers/commands/index.js';
import { getLoggerService } from '@workers/factories/loggerService.js';
import { ARTIST_PUBLISHER_FEEDS } from '@workers/lib/podcastIndex/artistPublisherFeeds.js';
import { sleepRateLimit } from '@workers/lib/podcastIndex/collectTrendingFeedIds.js';

import { parsePodcastIndexFeedById } from './parseFeed.js';

function hasForceParse(args: CommandLineArgs): boolean {
  return typeof args.f !== 'undefined' || typeof args.forceParse !== 'undefined';
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Local-dev seed: parse the committed ARTIST_PUBLISHER_FEEDS list only (no live PI crawl).
 * Refresh the list with `devDiscoverArtistPublisherFeeds` when needed.
 */
export async function devParserRSSParseArtistPublisherFeeds(args: CommandLineArgs) {
  const logger = getLoggerService();
  const forceParse = hasForceParse(args);

  const rawMaxArg = 'max' in args ? args.max : 'n' in args ? args.n : undefined;
  const rawMax = Array.isArray(rawMaxArg) ? rawMaxArg[0] : rawMaxArg;
  let feeds = [...ARTIST_PUBLISHER_FEEDS];
  if (rawMax !== undefined && rawMax !== '') {
    const parsed = parseInt(String(rawMax), 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      feeds = feeds.slice(0, parsed);
    }
  }

  if (feeds.length === 0) {
    logger.warn(
      '[devParserRSSParseArtistPublisherFeeds] ARTIST_PUBLISHER_FEEDS is empty. Run workers:discover_artist_publisher_feeds first.'
    );
    return;
  }

  logger.info(
    `[devParserRSSParseArtistPublisherFeeds] Parsing ${feeds.length} committed artist publisher-music feed(s).`
  );

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < feeds.length; i++) {
    if (i > 0) {
      await sleepRateLimit();
    }
    const feed = feeds[i];
    if (feed === undefined) {
      continue;
    }
    try {
      logger.info(
        `[devParserRSSParseArtistPublisherFeeds] Parsing ${feed.title} (podcast_index_id=${feed.podcastIndexId})...`
      );
      await parsePodcastIndexFeedById(feed.podcastIndexId, forceParse);
      succeeded += 1;
      logger.info(
        `[devParserRSSParseArtistPublisherFeeds] Parsed ${feed.title} (podcast_index_id=${feed.podcastIndexId}).`
      );
    } catch (error) {
      failed += 1;
      logger.error(
        `[devParserRSSParseArtistPublisherFeeds] Failed ${feed.title} (podcast_index_id=${feed.podcastIndexId}).`,
        normalizeError(error)
      );
    }
  }

  logger.info(
    `[devParserRSSParseArtistPublisherFeeds] Done. Succeeded: ${succeeded}, failed: ${failed}, total: ${feeds.length}.`
  );
}
