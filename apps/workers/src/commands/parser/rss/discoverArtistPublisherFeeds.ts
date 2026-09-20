import type { CommandLineArgs } from '@workers/commands/index.js';
import { getLoggerService } from '@workers/factories/loggerService.js';
import {
  DEFAULT_MAX_ARTIST_PUBLISHER_DISCOVER,
  discoverArtistPublisherFeeds,
  HARD_MAX_ARTIST_PUBLISHER_DISCOVER,
  writeArtistPublisherFeedsModule,
} from '@workers/lib/podcastIndex/discoverArtistPublisherFeeds.js';

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Maintainer-only: crawl PI for publisher-music artist feeds and rewrite the committed list.
 * Not part of QUICKSTART seeding.
 */
export async function devDiscoverArtistPublisherFeeds(args: CommandLineArgs) {
  const logger = getLoggerService();

  const rawMaxArg = 'max' in args ? args.max : 'n' in args ? args.n : undefined;
  const rawMax = Array.isArray(rawMaxArg) ? rawMaxArg[0] : rawMaxArg;
  let k = DEFAULT_MAX_ARTIST_PUBLISHER_DISCOVER;
  if (rawMax !== undefined && rawMax !== '') {
    const parsed = parseInt(String(rawMax), 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      k = parsed;
    }
  }

  if (k > HARD_MAX_ARTIST_PUBLISHER_DISCOVER) {
    logger.warn(
      `[devDiscoverArtistPublisherFeeds] -max / -n ${k} is above the ${HARD_MAX_ARTIST_PUBLISHER_DISCOVER} cap; using ${HARD_MAX_ARTIST_PUBLISHER_DISCOVER}.`
    );
    k = HARD_MAX_ARTIST_PUBLISHER_DISCOVER;
  }

  logger.info(
    `[devDiscoverArtistPublisherFeeds] Discovering up to ${k} artist publisher-music feed(s) (default ${DEFAULT_MAX_ARTIST_PUBLISHER_DISCOVER}, cap ${HARD_MAX_ARTIST_PUBLISHER_DISCOVER})...`
  );

  try {
    const feeds = await discoverArtistPublisherFeeds(k, {
      info: (message) => logger.info(message),
      warn: (message) => logger.warn(message),
    });

    if (feeds.length === 0) {
      logger.warn('[devDiscoverArtistPublisherFeeds] No artist feeds discovered; list unchanged.');
      return;
    }

    const writtenPath = writeArtistPublisherFeedsModule(feeds);
    logger.info(
      `[devDiscoverArtistPublisherFeeds] Wrote ${feeds.length} feed(s) to ${writtenPath}. Commit this file, then run workers:parse_artist_publisher_feeds.`
    );
  } catch (error) {
    logger.error('[devDiscoverArtistPublisherFeeds] Failed:', normalizeError(error));
    throw error;
  }
}
