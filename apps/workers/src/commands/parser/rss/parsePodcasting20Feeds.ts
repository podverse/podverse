import type { CommandLineArgs } from '@workers/commands/index.js';
import { getLoggerService } from '@workers/factories/loggerService.js';

import { parsePodcastIndexFeedById } from './parseFeed.js';

const PODCASTING20_FEEDS = [
  {
    podcastIndexId: 920666,
    title: 'Podcasting 2.0',
  },
  {
    podcastIndexId: 6524027,
    title: 'Boostagram Ball',
  },
  {
    podcastIndexId: 575694,
    title: 'Linux Unplugged',
  },
  {
    podcastIndexId: 6813728,
    title: 'This Week in Bitcoin',
  },
] as const;

function hasForceParse(args: CommandLineArgs): boolean {
  return typeof args.f !== 'undefined' || typeof args.forceParse !== 'undefined';
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export async function devParserRSSParsePodcasting20Feeds(args: CommandLineArgs) {
  const logger = getLoggerService();
  const forceParse = hasForceParse(args);

  logger.info(
    `[devParserRSSParsePodcasting20Feeds] Parsing ${PODCASTING20_FEEDS.length} Podcasting 2.0-related feed(s).`
  );

  let succeeded = 0;
  let failed = 0;

  for (const feed of PODCASTING20_FEEDS) {
    try {
      await parsePodcastIndexFeedById(feed.podcastIndexId, forceParse);
      succeeded += 1;
      logger.info(
        `[devParserRSSParsePodcasting20Feeds] Parsed ${feed.title} (podcast_index_id=${feed.podcastIndexId}).`
      );
    } catch (error) {
      failed += 1;
      logger.error(
        `[devParserRSSParsePodcasting20Feeds] Failed ${feed.title} (podcast_index_id=${feed.podcastIndexId}).`,
        normalizeError(error)
      );
    }
  }

  logger.info(
    `[devParserRSSParsePodcasting20Feeds] Done. Succeeded: ${succeeded}, failed: ${failed}, total: ${PODCASTING20_FEEDS.length}.`
  );
}
