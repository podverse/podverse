import type { ActiveMQArtemisService } from '@queue/services/activeMQArtemis/index.js';
import type { MQFeedMessage } from '@queue/types/mq.js';

import type {
  PodcastIndexService,
  RecentDataPage,
  RecentGetDataStopReason,
} from '@podverse/external-services-podcast-index';
import {
  PODCAST_INDEX_RECENT_DATA_MAX_LOOKBACK_SECONDS,
  RECENT_DATA_CURSOR_OVERLAP_SECONDS,
} from '@podverse/external-services-podcast-index';
import type { MQQueueConfigFunctionParams } from '@podverse/helpers';
import type { ILoggerLike } from '@podverse/helpers-backend';
import type { PodcastIndexStreamCursorState } from '@podverse/orm';
import {
  FeedService,
  lifecycleStateBlocksParseAndVisibility,
  PodcastIndexStreamCursorService,
  PodcastIndexStreamKeyEnum,
} from '@podverse/orm';
import type { ParseRSSFeedAndSaveToDatabaseOptions } from '@podverse/parser';

import type { GapSweepResult } from './catchUpFeedsFromPodcastIndex.js';
import {
  describeGapSweepCounts,
  sweepFeedsAgainstPodcastIndex,
} from './catchUpFeedsFromPodcastIndex.js';

const LOG_PREFIX = '[mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex]';

type MQRSSAddAllRecentlyUpdatedFeedsOptions = MQQueueConfigFunctionParams & {
  /** Assumed gap length in seconds when there is no saved cursor at all. */
  sinceRange: number;
  loggerService: ILoggerLike;
};

/**
 * - `caught_up`: every page up to now was sent and recorded.
 * - `time_cap`: the run stopped at the time cap; the cursor points at the last finished page.
 * - `upstream_error`: `/recent/data` failed after retries; the cursor stays at the last finished page.
 * - `send_failed`: a page or sweep chunk had a failed send; the cursor stays before it.
 * - `lock_held`: another run holds the stream; nothing was read.
 * - `gap_sweep_time_cap`: the gap sweep stopped at its cap; the next run continues it.
 * - `gap_sweep_finished`: a sweep continued from an earlier run finished; the next run reads
 *   `/recent/data` from the cursor saved when that sweep started.
 */
export type RecentlyUpdatedFeedsOutcome =
  | RecentGetDataStopReason
  | 'send_failed'
  | 'lock_held'
  | 'gap_sweep_time_cap'
  | 'gap_sweep_finished';

export type RecentlyUpdatedFeedsResult = {
  outcome: RecentlyUpdatedFeedsOutcome;
  pages: number;
  feeds: number;
  enqueued: number;
  /** Failed sends in the `/recent/data` pass and in the gap sweep. */
  failed: number;
  skippedNotInDb: number;
  skippedBlockingLifecycle: number;
  /** Saved `next_since` after the run, or null when none is stored. */
  cursorNextSince: number | null;
  /** The gap sweep this run did, or null when the cursor was usable. */
  gapSweep: GapSweepResult | null;
};

type PollerPodcastIndexService = Pick<
  PodcastIndexService,
  'recentGetData' | 'episodesGetNewestByFeedIds'
>;

type PageCounts = Pick<
  RecentlyUpdatedFeedsResult,
  'enqueued' | 'failed' | 'skippedNotInDb' | 'skippedBlockingLifecycle'
>;

/**
 * Enqueues feeds Podcast Index reports as updated, resuming from the saved `/recent/data` cursor.
 * Each page is sent in full before its `nextSince` is saved, so a run that stops early (time cap,
 * failed send, crash) is picked up by the next run without losing updates.
 *
 * When the cursor is missing or older than Podcast Index keeps `/recent/data`, the run first
 * sweeps every feed against Podcast Index (see `sweepFeedsAgainstPodcastIndex`). Starting a sweep
 * saves the `recent_data` cursor at the sweep's start time and a `gap_sweep` progress row; while
 * that row exists, each run continues the sweep instead of reading `/recent/data`. Once it is
 * done, reading resumes from the sweep's start time, so updates to feeds swept in earlier runs
 * are not lost.
 */
export const mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex = async (
  activeMQArtemisService: Pick<ActiveMQArtemisService, 'initialize' | 'sendMessage' | 'close'>,
  podcastIndexService: PollerPodcastIndexService,
  options: MQRSSAddAllRecentlyUpdatedFeedsOptions,
  msgOptions: ParseRSSFeedAndSaveToDatabaseOptions
): Promise<RecentlyUpdatedFeedsResult> => {
  const { loggerService } = options;
  const cursorService = new PodcastIndexStreamCursorService();

  const run = await cursorService.withExclusiveRun(PodcastIndexStreamKeyEnum.RecentData, () =>
    pollRecentlyUpdatedFeeds(
      activeMQArtemisService,
      podcastIndexService,
      cursorService,
      options,
      msgOptions
    )
  );

  if (!run.acquired) {
    loggerService.info(`${LOG_PREFIX} Another run holds the recent_data stream; exiting.`);
    return {
      outcome: 'lock_held',
      pages: 0,
      feeds: 0,
      enqueued: 0,
      failed: 0,
      skippedNotInDb: 0,
      skippedBlockingLifecycle: 0,
      cursorNextSince: null,
      gapSweep: null,
    };
  }

  const result = run.result;
  loggerService.info(
    `${LOG_PREFIX} Done (${result.outcome}). Pages: ${result.pages}, feeds: ${result.feeds}, ` +
      `enqueued: ${result.enqueued}, failed: ${result.failed}, ` +
      `skipped (not in db): ${result.skippedNotInDb}, ` +
      `skipped (lifecycle blocks parse): ${result.skippedBlockingLifecycle}, ` +
      `cursor next_since: ${result.cursorNextSince ?? 'none'}.`
  );
  return result;
};

function isUsableRecentDataCursor(
  cursor: PodcastIndexStreamCursorState | null,
  nowSeconds: number
): cursor is PodcastIndexStreamCursorState {
  return (
    cursor !== null &&
    nowSeconds - cursor.nextSince <= PODCAST_INDEX_RECENT_DATA_MAX_LOOKBACK_SECONDS
  );
}

async function pollRecentlyUpdatedFeeds(
  activeMQArtemisService: Pick<ActiveMQArtemisService, 'initialize' | 'sendMessage' | 'close'>,
  podcastIndexService: PollerPodcastIndexService,
  cursorService: PodcastIndexStreamCursorService,
  options: MQRSSAddAllRecentlyUpdatedFeedsOptions,
  msgOptions: ParseRSSFeedAndSaveToDatabaseOptions
): Promise<RecentlyUpdatedFeedsResult> {
  const { loggerService, sinceRange } = options;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const sweepProgress = await cursorService.get(PodcastIndexStreamKeyEnum.GapSweep);
  let cursor = await cursorService.get(PodcastIndexStreamKeyEnum.RecentData);

  const result: RecentlyUpdatedFeedsResult = {
    outcome: 'caught_up',
    pages: 0,
    feeds: 0,
    enqueued: 0,
    failed: 0,
    skippedNotInDb: 0,
    skippedBlockingLifecycle: 0,
    cursorNextSince: cursor?.nextSince ?? null,
    gapSweep: null,
  };

  await activeMQArtemisService.initialize();
  try {
    const feedService = new FeedService();

    if (sweepProgress !== null || !isUsableRecentDataCursor(cursor, nowSeconds)) {
      let gapStartSeconds: number;
      let afterFeedId: number;
      let gapDescription: string;
      if (sweepProgress === null) {
        gapStartSeconds = cursor?.nextSince ?? nowSeconds - sinceRange;
        afterFeedId = 0;
        gapDescription =
          cursor === null
            ? `no saved cursor; assuming the last ${sinceRange}s were read`
            : `saved cursor is ${nowSeconds - cursor.nextSince}s old (next_since=${cursor.nextSince})`;
        // Progress first: a crash between the two writes resumes the sweep rather than skipping it.
        await cursorService.replace({
          streamKey: PodcastIndexStreamKeyEnum.GapSweep,
          nextSince: gapStartSeconds,
          position: null,
        });
        cursor = await cursorService.advance({
          streamKey: PodcastIndexStreamKeyEnum.RecentData,
          nextSince: nowSeconds,
          position: null,
        });
        result.cursorNextSince = cursor.nextSince;
      } else {
        gapStartSeconds = sweepProgress.nextSince;
        afterFeedId = sweepProgress.position ?? 0;
        gapDescription = `continuing the sweep for the gap since ${gapStartSeconds}`;
      }

      const sweep = await sweepFeedsAgainstPodcastIndex({
        activeMQArtemisService,
        podcastIndexService,
        cursorService,
        feedService,
        gapStartSeconds,
        afterFeedId,
        queue: options,
        msgOptions,
        loggerService,
      });
      result.gapSweep = sweep;
      result.failed += sweep.failed;

      const sweepSummary =
        `Gap of ${nowSeconds - gapStartSeconds}s in the recent_data stream (${gapDescription}); ` +
        `swept feeds against Podcast Index (${sweep.outcome}): ${describeGapSweepCounts(sweep)}.`;
      if (sweepProgress === null) {
        loggerService.error(`${LOG_PREFIX} ${sweepSummary}`);
      } else {
        loggerService.info(`${LOG_PREFIX} ${sweepSummary}`);
      }

      if (sweep.outcome === 'send_failed') {
        result.outcome = 'send_failed';
        return result;
      }
      if (sweep.outcome === 'time_cap') {
        result.outcome = 'gap_sweep_time_cap';
        return result;
      }
      // A sweep that started in an earlier run leaves hours of `/recent/data` to read, which does
      // not fit in what is left of this run; the next run reads it from the saved cursor.
      if (sweepProgress !== null) {
        result.outcome = 'gap_sweep_finished';
        return result;
      }
    }

    if (cursor === null) {
      return result;
    }
    const since = Math.min(cursor.nextSince - RECENT_DATA_CURSOR_OVERLAP_SECONDS, nowSeconds);
    let cursorNextSince = cursor.nextSince;
    const pages = podcastIndexService.recentGetData(since);

    while (true) {
      const step = await pages.next();
      if (step.done === true) {
        result.outcome = step.value;
        break;
      }

      const page = step.value;
      const counts = await enqueuePage(
        activeMQArtemisService,
        feedService,
        page,
        options,
        msgOptions
      );
      result.pages += 1;
      result.feeds += page.feeds.length;
      result.enqueued += counts.enqueued;
      result.failed += counts.failed;
      result.skippedNotInDb += counts.skippedNotInDb;
      result.skippedBlockingLifecycle += counts.skippedBlockingLifecycle;

      if (counts.failed > 0) {
        loggerService.error(
          `${LOG_PREFIX} ${counts.failed} send(s) failed on the page since=${page.since}; ` +
            `stopping without advancing the cursor (next_since=${cursorNextSince}).`
        );
        result.outcome = 'send_failed';
        break;
      }

      if (page.nextSince !== null) {
        const saved = await cursorService.advance({
          streamKey: PodcastIndexStreamKeyEnum.RecentData,
          nextSince: page.nextSince,
          position: page.position,
        });
        cursorNextSince = saved.nextSince;
        result.cursorNextSince = cursorNextSince;
      }
    }
  } finally {
    try {
      if (options.closeAfterSend) {
        await activeMQArtemisService.close();
      }
    } catch {
      // swallow
    }
  }

  if (result.outcome === 'time_cap') {
    const { cursorNextSince } = result;
    const behindSeconds = cursorNextSince === null ? null : nowSeconds - cursorNextSince;
    loggerService.warn(
      `${LOG_PREFIX} Stopped at the time cap; the next run resumes from next_since=` +
        `${cursorNextSince ?? 'none'}, ${behindSeconds ?? 'unknown'}s behind the start of this run.`
    );
  }

  if (result.outcome === 'upstream_error') {
    const { cursorNextSince } = result;
    loggerService.warn(
      `${LOG_PREFIX} Podcast Index stopped this run with an upstream error after retries; ` +
        `the next run resumes from next_since=${cursorNextSince ?? 'none'}.`
    );
  }

  return result;
}

async function enqueuePage(
  activeMQArtemisService: Pick<ActiveMQArtemisService, 'sendMessage'>,
  feedService: FeedService,
  page: RecentDataPage,
  options: MQRSSAddAllRecentlyUpdatedFeedsOptions,
  msgOptions: ParseRSSFeedAndSaveToDatabaseOptions
): Promise<PageCounts> {
  const counts: PageCounts = {
    enqueued: 0,
    failed: 0,
    skippedNotInDb: 0,
    skippedBlockingLifecycle: 0,
  };

  const feedUrlByPodcastIndexId = new Map<number, string>();
  for (const feed of page.feeds) {
    if (!feedUrlByPodcastIndexId.has(feed.feedId)) {
      feedUrlByPodcastIndexId.set(feed.feedId, feed.feedUrl);
    }
  }
  if (feedUrlByPodcastIndexId.size === 0) {
    return counts;
  }

  const lifecycleRows = await feedService.listLifecycleByPodcastIndexIds([
    ...feedUrlByPodcastIndexId.keys(),
  ]);
  const stateKeyByPodcastIndexId = new Map(
    lifecycleRows.map((row) => [row.podcastIndexId, row.stateKey] as const)
  );

  for (const [podcastIndexId, feedUrl] of feedUrlByPodcastIndexId) {
    if (!stateKeyByPodcastIndexId.has(podcastIndexId)) {
      counts.skippedNotInDb += 1;
      continue;
    }
    const stateKey = stateKeyByPodcastIndexId.get(podcastIndexId) ?? null;
    if (stateKey !== null && lifecycleStateBlocksParseAndVisibility(stateKey)) {
      counts.skippedBlockingLifecycle += 1;
      continue;
    }

    const message: MQFeedMessage = {
      url: feedUrl,
      podcast_index_id: podcastIndexId,
      options: msgOptions,
    };

    try {
      await activeMQArtemisService.sendMessage({
        queueName: options.queueName,
        message,
        priority: options.priority,
        dedupeCacheTimeMS: options.dedupeCacheTimeMS,
      });
      counts.enqueued += 1;
    } catch (error) {
      counts.failed += 1;
      options.loggerService.error(
        `${LOG_PREFIX} podcast_index_id=${podcastIndexId} send failed:`,
        error
      );
    }
  }

  return counts;
}
