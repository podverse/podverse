import type { ActiveMQArtemisService } from '@queue/services/activeMQArtemis/index.js';
import type { MQFeedMessage } from '@queue/types/mq.js';

import type {
  PodcastIndexNewestEpisode,
  PodcastIndexService,
} from '@podverse/external-services-podcast-index';
import {
  isPodcastIndexClientAbortError,
  PODCAST_INDEX_EPISODES_BY_FEED_ID_MAX_IDS,
  PODCAST_INDEX_GAP_SWEEP_MAX_RUN_MS,
} from '@podverse/external-services-podcast-index';
import type { MQQueueConfig, MQQueueConfigFunctionParams } from '@podverse/helpers';
import { DATABASE_CONSTANTS, formatGuidEnclosureUrl } from '@podverse/helpers';
import type { ILoggerLike } from '@podverse/helpers-backend';
import type { FeedGapSweepRow, FeedNewestItem } from '@podverse/orm';
import {
  FeedService,
  lifecycleStateBlocksParseAndVisibility,
  PodcastIndexStreamCursorService,
  PodcastIndexStreamKeyEnum,
} from '@podverse/orm';
import type { ParseRSSFeedAndSaveToDatabaseOptions } from '@podverse/parser';

const LOG_PREFIX = '[mqRSSCatchUpFromPodcastIndex]';

/**
 * - `queue_changed`: Podcast Index's newest episode is not our newest item, or we have no item.
 * - `queue_unlisted`: Podcast Index lists no episode and the feed has not finished a parse since
 *   the gap started.
 * - `unchanged`: Podcast Index's newest episode is our newest item.
 * - `unlisted_recently_parsed`: Podcast Index lists no episode and the feed finished a parse
 *   after the gap started.
 */
export type GapSweepFeedDecision =
  'queue_changed' | 'queue_unlisted' | 'unchanged' | 'unlisted_recently_parsed';

/**
 * - `finished`: every feed was checked and the `gap_sweep` row is cleared.
 * - `time_cap`: `PODCAST_INDEX_GAP_SWEEP_MAX_RUN_MS` passed; `gap_sweep` holds the last swept feed.
 * - `send_failed`: a chunk had a failed send; `gap_sweep` stays before that chunk.
 */
export type GapSweepOutcome = 'finished' | 'time_cap' | 'send_failed';

export type GapSweepResult = {
  outcome: GapSweepOutcome;
  gapStartSeconds: number;
  chunks: number;
  feedsChecked: number;
  enqueuedChanged: number;
  enqueuedUnlisted: number;
  unchanged: number;
  skippedUnlistedRecentlyParsed: number;
  skippedBlockingLifecycle: number;
  failed: number;
  /** Last `feed.id` whose chunk finished in this run, or null when none did. */
  lastFeedId: number | null;
};

type ChunkCounts = Pick<
  GapSweepResult,
  | 'enqueuedChanged'
  | 'enqueuedUnlisted'
  | 'unchanged'
  | 'skippedUnlistedRecentlyParsed'
  | 'skippedBlockingLifecycle'
  | 'failed'
>;

export type GapSweepParams = {
  activeMQArtemisService: Pick<ActiveMQArtemisService, 'sendMessage'>;
  podcastIndexService: Pick<PodcastIndexService, 'episodesGetNewestByFeedIds'>;
  cursorService: PodcastIndexStreamCursorService;
  feedService: FeedService;
  /** Unix seconds when updates stopped being read. */
  gapStartSeconds: number;
  /** Sweep feeds with a `feed.id` above this one. */
  afterFeedId: number;
  queue: MQQueueConfig;
  msgOptions: ParseRSSFeedAndSaveToDatabaseOptions;
  loggerService: ILoggerLike;
};

/**
 * Decides whether one feed needs a parse after a gap in the `/recent/data` stream. Podcast
 * Index's newest episode matches our newest item on guid first, then on enclosure URL, the same
 * order the parser matches items in. A wrong "queue" costs one parse that stops at the file hash
 * check; a wrong "unchanged" loses an episode, so anything that does not match queues.
 */
export function decideGapSweepFeed(params: {
  episode: PodcastIndexNewestEpisode | null;
  newestItem: FeedNewestItem | null;
  lastFinishedParseTime: Date | null;
  gapStartSeconds: number;
}): GapSweepFeedDecision {
  const { episode, newestItem, lastFinishedParseTime, gapStartSeconds } = params;

  if (episode === null) {
    const parsedSinceGapStart =
      lastFinishedParseTime !== null && lastFinishedParseTime.getTime() >= gapStartSeconds * 1000;
    return parsedSinceGapStart ? 'unlisted_recently_parsed' : 'queue_unlisted';
  }

  if (newestItem === null) {
    return 'queue_changed';
  }

  if (
    episode.guid !== null &&
    newestItem.guid !== null &&
    episode.guid.slice(0, DATABASE_CONSTANTS.varchar_url) === newestItem.guid
  ) {
    return 'unchanged';
  }

  if (
    episode.enclosureUrl !== null &&
    newestItem.enclosureUrl !== null &&
    formatGuidEnclosureUrl(episode.enclosureUrl) === newestItem.enclosureUrl
  ) {
    return 'unchanged';
  }

  return 'queue_changed';
}

/**
 * Checks every feed with a `feed.id` above `afterFeedId` against Podcast Index's newest episode,
 * 200 feeds per request, and queues the ones that changed. Progress is saved in the `gap_sweep`
 * cursor row after each chunk is fully sent, and the row is cleared when the last chunk is done.
 * The caller holds the `recent_data` run lock and owns the MQ connection.
 */
export async function sweepFeedsAgainstPodcastIndex(
  params: GapSweepParams
): Promise<GapSweepResult> {
  const { cursorService, feedService, gapStartSeconds, loggerService } = params;
  const startedAtMs = Date.now();
  const result: GapSweepResult = {
    outcome: 'finished',
    gapStartSeconds,
    chunks: 0,
    feedsChecked: 0,
    enqueuedChanged: 0,
    enqueuedUnlisted: 0,
    unchanged: 0,
    skippedUnlistedRecentlyParsed: 0,
    skippedBlockingLifecycle: 0,
    failed: 0,
    lastFeedId: null,
  };

  let afterFeedId = params.afterFeedId;
  let isFirstRequest = true;

  while (true) {
    const elapsedMs = Date.now() - startedAtMs;
    if (elapsedMs > PODCAST_INDEX_GAP_SWEEP_MAX_RUN_MS) {
      result.outcome = 'time_cap';
      loggerService.warn(
        `${LOG_PREFIX} Stopped after ${elapsedMs}ms (cap ${PODCAST_INDEX_GAP_SWEEP_MAX_RUN_MS}ms); ` +
          `the next run continues after feed.id=${afterFeedId}.`
      );
      break;
    }

    const rows = await feedService.listForGapSweep({
      afterFeedId,
      limit: PODCAST_INDEX_EPISODES_BY_FEED_ID_MAX_IDS,
    });
    if (rows.length === 0) {
      await cursorService.clear(PodcastIndexStreamKeyEnum.GapSweep);
      break;
    }

    let chunk;
    try {
      chunk = await sweepChunk(params, rows, isFirstRequest);
    } catch (error: unknown) {
      if (isPodcastIndexClientAbortError(error)) {
        result.outcome = 'time_cap';
        loggerService.warn(
          `${LOG_PREFIX} Podcast Index newest-episode request timed out after retries in the chunk ` +
            `after feed.id=${afterFeedId}; stopping and resuming next run from the last completed chunk.`
        );
        break;
      }
      throw error;
    }
    const { counts, requested } = chunk;
    isFirstRequest = isFirstRequest && !requested;
    result.chunks += 1;
    result.feedsChecked += rows.length;
    result.enqueuedChanged += counts.enqueuedChanged;
    result.enqueuedUnlisted += counts.enqueuedUnlisted;
    result.unchanged += counts.unchanged;
    result.skippedUnlistedRecentlyParsed += counts.skippedUnlistedRecentlyParsed;
    result.skippedBlockingLifecycle += counts.skippedBlockingLifecycle;
    result.failed += counts.failed;

    if (counts.failed > 0) {
      result.outcome = 'send_failed';
      loggerService.error(
        `${LOG_PREFIX} ${counts.failed} send(s) failed in the chunk after feed.id=${afterFeedId}; ` +
          'stopping without saving progress past it.'
      );
      break;
    }

    const lastRow = rows[rows.length - 1];
    if (lastRow === undefined) {
      break;
    }
    afterFeedId = lastRow.feedId;
    result.lastFeedId = afterFeedId;

    if (rows.length < PODCAST_INDEX_EPISODES_BY_FEED_ID_MAX_IDS) {
      await cursorService.clear(PodcastIndexStreamKeyEnum.GapSweep);
      break;
    }
    await cursorService.replace({
      streamKey: PodcastIndexStreamKeyEnum.GapSweep,
      nextSince: gapStartSeconds,
      position: afterFeedId,
    });
  }

  return result;
}

async function sweepChunk(
  params: GapSweepParams,
  rows: readonly FeedGapSweepRow[],
  isFirstRequest: boolean
): Promise<{ counts: ChunkCounts; requested: boolean }> {
  const counts: ChunkCounts = {
    enqueuedChanged: 0,
    enqueuedUnlisted: 0,
    unchanged: 0,
    skippedUnlistedRecentlyParsed: 0,
    skippedBlockingLifecycle: 0,
    failed: 0,
  };

  const parseable: FeedGapSweepRow[] = [];
  for (const row of rows) {
    if (row.stateKey !== null && lifecycleStateBlocksParseAndVisibility(row.stateKey)) {
      counts.skippedBlockingLifecycle += 1;
    } else {
      parseable.push(row);
    }
  }
  if (parseable.length === 0) {
    return { counts, requested: false };
  }

  const episodes = await params.podcastIndexService.episodesGetNewestByFeedIds(
    parseable.map((row) => row.podcastIndexId),
    isFirstRequest
  );
  const episodeByPodcastIndexId = new Map<number, PodcastIndexNewestEpisode>();
  for (const episode of episodes) {
    if (!episodeByPodcastIndexId.has(episode.feedId)) {
      episodeByPodcastIndexId.set(episode.feedId, episode);
    }
  }

  const newestItems = await params.feedService.listNewestItemByFeedIds(
    parseable.map((row) => row.feedId)
  );
  const newestItemByFeedId = new Map(newestItems.map((item) => [item.feedId, item] as const));

  for (const row of parseable) {
    const decision = decideGapSweepFeed({
      episode: episodeByPodcastIndexId.get(row.podcastIndexId) ?? null,
      newestItem: newestItemByFeedId.get(row.feedId) ?? null,
      lastFinishedParseTime: row.lastFinishedParseTime,
      gapStartSeconds: params.gapStartSeconds,
    });

    if (decision === 'unchanged') {
      counts.unchanged += 1;
      continue;
    }
    if (decision === 'unlisted_recently_parsed') {
      counts.skippedUnlistedRecentlyParsed += 1;
      continue;
    }

    const message: MQFeedMessage = {
      url: row.url,
      podcast_index_id: row.podcastIndexId,
      options: params.msgOptions,
    };
    try {
      await params.activeMQArtemisService.sendMessage({
        queueName: params.queue.queueName,
        message,
        priority: params.queue.priority,
        dedupeCacheTimeMS: params.queue.dedupeCacheTimeMS,
      });
      if (decision === 'queue_changed') {
        counts.enqueuedChanged += 1;
      } else {
        counts.enqueuedUnlisted += 1;
      }
    } catch (error) {
      counts.failed += 1;
      params.loggerService.error(
        `${LOG_PREFIX} podcast_index_id=${row.podcastIndexId} send failed:`,
        error
      );
    }
  }

  return { counts, requested: true };
}

export function describeGapSweepCounts(result: GapSweepResult): string {
  return (
    `chunks: ${result.chunks}, feeds checked: ${result.feedsChecked}, ` +
    `queued (changed): ${result.enqueuedChanged}, queued (not listed, stale parse): ` +
    `${result.enqueuedUnlisted}, unchanged: ${result.unchanged}, ` +
    `skipped (not listed, parsed since gap start): ${result.skippedUnlistedRecentlyParsed}, ` +
    `skipped (lifecycle blocks parse): ${result.skippedBlockingLifecycle}, ` +
    `failed: ${result.failed}, last feed.id: ${result.lastFeedId ?? 'none'}`
  );
}

type MQRSSCatchUpFromPodcastIndexOptions = MQQueueConfigFunctionParams & {
  /** Unix seconds when updates stopped being read. */
  sinceSeconds: number;
  loggerService: ILoggerLike;
};

export type CatchUpFromPodcastIndexResult =
  { outcome: 'lock_held' } | (GapSweepResult & { resumed: boolean });

/**
 * Operator-run catch-up: sweeps every feed against Podcast Index for a gap that started at
 * `sinceSeconds`. It holds the same run lock as the recent-feeds poller. An unfinished sweep for
 * the same `sinceSeconds` resumes after its last swept feed; another start time begins again from
 * the first feed. A sweep stopped by the time cap leaves its `gap_sweep` row, and the poller's
 * next run continues it.
 */
export const mqRSSCatchUpFromPodcastIndex = async (
  activeMQArtemisService: Pick<ActiveMQArtemisService, 'initialize' | 'sendMessage' | 'close'>,
  podcastIndexService: Pick<PodcastIndexService, 'episodesGetNewestByFeedIds'>,
  options: MQRSSCatchUpFromPodcastIndexOptions,
  msgOptions: ParseRSSFeedAndSaveToDatabaseOptions
): Promise<CatchUpFromPodcastIndexResult> => {
  const { loggerService, sinceSeconds } = options;
  const cursorService = new PodcastIndexStreamCursorService();

  const run = await cursorService.withExclusiveRun(
    PodcastIndexStreamKeyEnum.RecentData,
    async () => {
      const progress = await cursorService.get(PodcastIndexStreamKeyEnum.GapSweep);
      const resumed = progress !== null && progress.nextSince === sinceSeconds;
      const afterFeedId = resumed ? (progress.position ?? 0) : 0;
      if (!resumed) {
        await cursorService.replace({
          streamKey: PodcastIndexStreamKeyEnum.GapSweep,
          nextSince: sinceSeconds,
          position: null,
        });
      }
      loggerService.info(
        `${LOG_PREFIX} ${resumed ? 'Resuming' : 'Starting'} a sweep for the gap since ` +
          `${sinceSeconds} after feed.id=${afterFeedId}.`
      );

      await activeMQArtemisService.initialize();
      try {
        const sweep = await sweepFeedsAgainstPodcastIndex({
          activeMQArtemisService,
          podcastIndexService,
          cursorService,
          feedService: new FeedService(),
          gapStartSeconds: sinceSeconds,
          afterFeedId,
          queue: options,
          msgOptions,
          loggerService,
        });
        return { ...sweep, resumed };
      } finally {
        try {
          if (options.closeAfterSend) {
            await activeMQArtemisService.close();
          }
        } catch {
          // swallow
        }
      }
    }
  );

  if (!run.acquired) {
    loggerService.info(`${LOG_PREFIX} Another run holds the recent_data stream; nothing swept.`);
    return { outcome: 'lock_held' };
  }

  loggerService.info(
    `${LOG_PREFIX} Done (${run.result.outcome}). ${describeGapSweepCounts(run.result)}.`
  );
  return run.result;
};
