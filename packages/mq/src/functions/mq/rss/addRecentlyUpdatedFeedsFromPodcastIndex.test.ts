import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const orm = vi.hoisted(() => {
  type CursorState = {
    streamKey: string;
    nextSince: number;
    position: number | null;
    updatedAt: Date;
  };
  type CursorWrite = { streamKey: string; nextSince: number; position: number | null };
  type LifecycleRow = { feedId: number; podcastIndexId: number; stateKey: string | null };
  type SweepRow = {
    feedId: number;
    url: string;
    podcastIndexId: number;
    stateKey: string | null;
    lastFinishedParseTime: Date | null;
  };
  type NewestItem = {
    feedId: number;
    guid: string | null;
    enclosureUrl: string | null;
    pubDate: Date | null;
  };

  const state: {
    cursor: CursorState | null;
    gapSweep: CursorState | null;
    lockAvailable: boolean;
    lifecycleRows: LifecycleRow[];
    sweepRows: SweepRow[];
    newestItems: NewestItem[];
    events: string[];
  } = {
    cursor: null,
    gapSweep: null,
    lockAvailable: true,
    lifecycleRows: [],
    sweepRows: [],
    newestItems: [],
    events: [],
  };

  const listLifecycleByPodcastIndexIds = vi.fn(async (ids: readonly number[]) =>
    state.lifecycleRows.filter((row) => ids.includes(row.podcastIndexId))
  );

  const listForGapSweep = vi.fn(async (params: { afterFeedId: number; limit: number }) =>
    state.sweepRows.filter((row) => row.feedId > params.afterFeedId).slice(0, params.limit)
  );

  const listNewestItemByFeedIds = vi.fn(async (feedIds: readonly number[]) =>
    state.newestItems.filter((item) => feedIds.includes(item.feedId))
  );

  const advance = vi.fn(async (params: CursorWrite) => {
    state.events.push(`advance:${params.nextSince}`);
    if (state.cursor === null || params.nextSince >= state.cursor.nextSince) {
      state.cursor = {
        streamKey: params.streamKey,
        nextSince: params.nextSince,
        position: params.position ?? state.cursor?.position ?? null,
        updatedAt: new Date(),
      };
    }
    return state.cursor;
  });

  const replace = vi.fn(async (params: CursorWrite) => {
    state.events.push(`replace:${params.streamKey}:${params.nextSince}:${params.position}`);
    state.gapSweep = { ...params, updatedAt: new Date() };
  });

  const clear = vi.fn(async (streamKey: string) => {
    state.events.push(`clear:${streamKey}`);
    if (streamKey === 'gap_sweep') {
      state.gapSweep = null;
    }
  });

  return {
    state,
    listLifecycleByPodcastIndexIds,
    listForGapSweep,
    listNewestItemByFeedIds,
    advance,
    replace,
    clear,
  };
});

vi.mock('@podverse/orm', () => {
  const blocking = new Set(['pending_archive', 'archived', 'merged', 'takedown']);
  return {
    PodcastIndexStreamKeyEnum: { RecentData: 'recent_data', GapSweep: 'gap_sweep' },
    FeedLifecycleStateKeyEnum: {
      Active: 'active',
      PendingArchive: 'pending_archive',
      Archived: 'archived',
      Merged: 'merged',
      Takedown: 'takedown',
    },
    lifecycleStateBlocksParseAndVisibility: (stateKey: string) => blocking.has(stateKey),
    FeedService: class {
      listLifecycleByPodcastIndexIds = orm.listLifecycleByPodcastIndexIds;
      listForGapSweep = orm.listForGapSweep;
      listNewestItemByFeedIds = orm.listNewestItemByFeedIds;
    },
    PodcastIndexStreamCursorService: class {
      get = async (streamKey: string) =>
        streamKey === 'gap_sweep' ? orm.state.gapSweep : orm.state.cursor;
      advance = orm.advance;
      replace = orm.replace;
      clear = orm.clear;
      withExclusiveRun = async <T>(_streamKey: string, run: () => Promise<T>) =>
        orm.state.lockAvailable ? { acquired: true, result: await run() } : { acquired: false };
    },
  };
});

import type { ActiveMQArtemisService } from '@queue/services/activeMQArtemis/index.js';

import type {
  PodcastIndexNewestEpisode,
  PodcastIndexService,
  RecentDataPage,
  RecentGetDataStopReason,
} from '@podverse/external-services-podcast-index';
import {
  PODCAST_INDEX_EPISODES_BY_FEED_ID_MAX_IDS,
  PODCAST_INDEX_GAP_SWEEP_MAX_RUN_MS,
  PODCAST_INDEX_RECENT_DATA_MAX_LOOKBACK_SECONDS,
  RECENT_DATA_CURSOR_OVERLAP_SECONDS,
} from '@podverse/external-services-podcast-index';
import { MQ_QUEUES } from '@podverse/helpers';
import type { ILoggerLike } from '@podverse/helpers-backend';
import { FeedLifecycleStateKeyEnum } from '@podverse/orm';

import { mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex } from './addRecentlyUpdatedFeedsFromPodcastIndex.js';

type ArtemisFake = Pick<ActiveMQArtemisService, 'initialize' | 'sendMessage' | 'close'>;
type PodcastIndexFake = Pick<
  PodcastIndexService,
  'recentGetData' | 'episodesGetNewestByFeedIds'
> & {
  sinceCalls: number[];
  pagesRead: () => number;
  newestCalls: number[][];
};

const NOW = new Date('2026-11-01T21:30:00.000Z');
const NOW_SECONDS = Math.floor(NOW.getTime() / 1000);
const SINCE_RANGE = 900;

const msgOptions = {
  forceParse: false,
  onDemandParserEvent: { accountId: null, type: null, remoteParentPodcastIndexId: null },
};

function createLogger(): ILoggerLike {
  return {
    addRemoteTransport: vi.fn(),
    logError: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

function createArtemis(failingPodcastIndexIds: readonly number[] = []): ArtemisFake {
  return {
    initialize: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    sendMessage: vi.fn(async (params: Parameters<ActiveMQArtemisService['sendMessage']>[0]) => {
      const { message } = params;
      const podcastIndexId =
        'podcast_index_id' in message && typeof message.podcast_index_id === 'number'
          ? message.podcast_index_id
          : null;
      orm.state.events.push(`send:${podcastIndexId}`);
      if (podcastIndexId !== null && failingPodcastIndexIds.includes(podcastIndexId)) {
        throw new Error('Message rejected');
      }
    }),
  };
}

/**
 * A Podcast Index fake that yields `pages`, records each `since`, and answers newest-episode
 * requests from `episodes`. `msPerNewestCall` moves the clock forward on each newest request.
 */
function createPodcastIndex(
  pages: RecentDataPage[],
  stopReason: RecentGetDataStopReason = 'caught_up',
  options: { episodes?: PodcastIndexNewestEpisode[]; msPerNewestCall?: number } = {}
): PodcastIndexFake {
  const sinceCalls: number[] = [];
  const newestCalls: number[][] = [];
  let pagesRead = 0;
  return {
    sinceCalls,
    newestCalls,
    pagesRead: () => pagesRead,
    async *recentGetData(since: number): AsyncGenerator<RecentDataPage, RecentGetDataStopReason> {
      sinceCalls.push(since);
      for (const page of pages) {
        pagesRead += 1;
        yield page;
      }
      return stopReason;
    },
    async episodesGetNewestByFeedIds(podcastIndexIds: readonly number[]) {
      newestCalls.push([...podcastIndexIds]);
      if (options.msPerNewestCall !== undefined) {
        vi.setSystemTime(new Date(Date.now() + options.msPerNewestCall));
      }
      return (options.episodes ?? []).filter((episode) => podcastIndexIds.includes(episode.feedId));
    },
  };
}

function page(since: number, feedIds: number[], nextSince: number | null): RecentDataPage {
  return {
    since,
    feeds: feedIds.map((feedId) => ({ feedId, feedUrl: `https://example.com/${feedId}.xml` })),
    nextSince,
    position: nextSince === null ? null : nextSince * 10,
  };
}

function knownFeeds(podcastIndexIds: number[]) {
  orm.state.lifecycleRows = podcastIndexIds.map((podcastIndexId) => ({
    feedId: podcastIndexId + 1000,
    podcastIndexId,
    stateKey: FeedLifecycleStateKeyEnum.Active,
  }));
}

function savedCursor(nextSince: number, position: number | null = null) {
  orm.state.cursor = { streamKey: 'recent_data', nextSince, position, updatedAt: NOW };
}

/** Feeds `1..count` for the gap sweep, Podcast Index id `feedId + 5000`, never parsed. */
function sweepFeeds(count: number) {
  orm.state.sweepRows = Array.from({ length: count }, (_, index) => ({
    feedId: index + 1,
    url: `https://example.com/sweep-${index + 1}.xml`,
    podcastIndexId: index + 5001,
    stateKey: FeedLifecycleStateKeyEnum.Active,
    lastFinishedParseTime: null,
  }));
}

function run(
  artemis: ArtemisFake,
  podcastIndex: Pick<PodcastIndexService, 'recentGetData' | 'episodesGetNewestByFeedIds'>,
  loggerService: ILoggerLike = createLogger()
) {
  return mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex(
    artemis,
    podcastIndex,
    {
      ...MQ_QUEUES['rss-normal'],
      sinceRange: SINCE_RANGE,
      closeAfterSend: true,
      loggerService,
    },
    msgOptions
  );
}

describe('mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    orm.state.cursor = null;
    orm.state.gapSweep = null;
    orm.state.lockAvailable = true;
    orm.state.lifecycleRows = [];
    orm.state.sweepRows = [];
    orm.state.newestItems = [];
    orm.state.events = [];
    orm.listLifecycleByPodcastIndexIds.mockClear();
    orm.listForGapSweep.mockClear();
    orm.listNewestItemByFeedIds.mockClear();
    orm.advance.mockClear();
    orm.replace.mockClear();
    orm.clear.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resumes from the saved cursor minus the overlap without sweeping', async () => {
    const cursorNextSince = NOW_SECONDS - 600;
    savedCursor(cursorNextSince, 5);
    const podcastIndex = createPodcastIndex([]);
    const loggerService = createLogger();

    const result = await run(createArtemis(), podcastIndex, loggerService);

    expect(podcastIndex.sinceCalls).toEqual([cursorNextSince - RECENT_DATA_CURSOR_OVERLAP_SECONDS]);
    expect(orm.listForGapSweep).not.toHaveBeenCalled();
    expect(result.gapSweep).toBeNull();
    expect(loggerService.error).not.toHaveBeenCalled();
  });

  it('sweeps from sinceRange ago when there is no cursor, then reads recent data from the sweep start', async () => {
    sweepFeeds(2);
    orm.state.newestItems = [
      { feedId: 2, guid: 'ep-2', enclosureUrl: null, pubDate: new Date('2026-10-01T00:00:00Z') },
    ];
    const podcastIndex = createPodcastIndex([], 'caught_up', {
      episodes: [
        { feedId: 5001, guid: 'ep-new', enclosureUrl: null, datePublished: NOW_SECONDS - 100 },
        { feedId: 5002, guid: 'ep-2', enclosureUrl: null, datePublished: NOW_SECONDS - 9000 },
      ],
    });
    const loggerService = createLogger();

    const result = await run(createArtemis(), podcastIndex, loggerService);

    expect(orm.state.events).toEqual([
      `replace:gap_sweep:${NOW_SECONDS - SINCE_RANGE}:null`,
      `advance:${NOW_SECONDS}`,
      'send:5001',
      'clear:gap_sweep',
    ]);
    expect(podcastIndex.sinceCalls).toEqual([NOW_SECONDS - RECENT_DATA_CURSOR_OVERLAP_SECONDS]);
    expect(orm.state.gapSweep).toBeNull();
    expect(result).toMatchObject({
      outcome: 'caught_up',
      cursorNextSince: NOW_SECONDS,
      gapSweep: { outcome: 'finished', enqueuedChanged: 1, unchanged: 1 },
    });
    expect(loggerService.error).toHaveBeenCalledTimes(1);
    expect(loggerService.error).toHaveBeenCalledWith(
      expect.stringContaining(`Gap of ${SINCE_RANGE}s`)
    );
    expect(loggerService.error).toHaveBeenCalledWith(expect.stringContaining('no saved cursor'));
  });

  it('uses a stale cursor as the gap start and logs the gap length with the counts', async () => {
    const gapSeconds = PODCAST_INDEX_RECENT_DATA_MAX_LOOKBACK_SECONDS + 3600;
    savedCursor(NOW_SECONDS - gapSeconds);
    sweepFeeds(1);
    const loggerService = createLogger();

    await run(createArtemis(), createPodcastIndex([]), loggerService);

    expect(orm.replace).toHaveBeenCalledWith({
      streamKey: 'gap_sweep',
      nextSince: NOW_SECONDS - gapSeconds,
      position: null,
    });
    expect(loggerService.error).toHaveBeenCalledTimes(1);
    expect(loggerService.error).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(`Gap of ${gapSeconds}s.*queued \\(not listed, stale parse\\): 1`)
      )
    );
  });

  it('keeps gap_sweep progress and skips recent data when the sweep cap stops it', async () => {
    sweepFeeds(PODCAST_INDEX_EPISODES_BY_FEED_ID_MAX_IDS + 50);
    const podcastIndex = createPodcastIndex([], 'caught_up', {
      msPerNewestCall: PODCAST_INDEX_GAP_SWEEP_MAX_RUN_MS + 1,
    });

    const result = await run(createArtemis(), podcastIndex);

    expect(podcastIndex.newestCalls).toHaveLength(1);
    expect(orm.state.gapSweep).toMatchObject({
      nextSince: NOW_SECONDS - SINCE_RANGE,
      position: PODCAST_INDEX_EPISODES_BY_FEED_ID_MAX_IDS,
    });
    expect(orm.clear).not.toHaveBeenCalled();
    expect(podcastIndex.sinceCalls).toEqual([]);
    expect(result).toMatchObject({
      outcome: 'gap_sweep_time_cap',
      gapSweep: { outcome: 'time_cap', lastFeedId: PODCAST_INDEX_EPISODES_BY_FEED_ID_MAX_IDS },
    });
  });

  it('continues an unfinished sweep before reading recent data, and leaves that read to the next run', async () => {
    savedCursor(NOW_SECONDS - 1200);
    sweepFeeds(PODCAST_INDEX_EPISODES_BY_FEED_ID_MAX_IDS + 50);
    const gapStart = NOW_SECONDS - 3 * 24 * 3600;
    orm.state.gapSweep = {
      streamKey: 'gap_sweep',
      nextSince: gapStart,
      position: PODCAST_INDEX_EPISODES_BY_FEED_ID_MAX_IDS,
      updatedAt: NOW,
    };
    const podcastIndex = createPodcastIndex([page(NOW_SECONDS - 1260, [1], NOW_SECONDS)]);
    const loggerService = createLogger();

    const result = await run(createArtemis(), podcastIndex, loggerService);

    expect(orm.listForGapSweep).toHaveBeenCalledWith({
      afterFeedId: PODCAST_INDEX_EPISODES_BY_FEED_ID_MAX_IDS,
      limit: PODCAST_INDEX_EPISODES_BY_FEED_ID_MAX_IDS,
    });
    expect(podcastIndex.newestCalls).toEqual([
      Array.from(
        { length: 50 },
        (_, index) => PODCAST_INDEX_EPISODES_BY_FEED_ID_MAX_IDS + index + 5001
      ),
    ]);
    expect(orm.state.gapSweep).toBeNull();
    expect(orm.advance).not.toHaveBeenCalled();
    expect(podcastIndex.sinceCalls).toEqual([]);
    expect(result).toMatchObject({
      outcome: 'gap_sweep_finished',
      cursorNextSince: NOW_SECONDS - 1200,
    });
    expect(loggerService.error).not.toHaveBeenCalled();
  });

  it('fails without saving sweep progress past a chunk with a failed send', async () => {
    sweepFeeds(2);

    const result = await run(createArtemis([5002]), createPodcastIndex([]));

    expect(orm.state.gapSweep).toMatchObject({ position: null });
    expect(orm.clear).not.toHaveBeenCalled();
    expect(result).toMatchObject({ outcome: 'send_failed', failed: 1 });
  });

  it('advances the cursor to each page only after every feed on that page was sent', async () => {
    knownFeeds([1, 2, 3]);
    const start = NOW_SECONDS - SINCE_RANGE;
    savedCursor(start + RECENT_DATA_CURSOR_OVERLAP_SECONDS);
    const podcastIndex = createPodcastIndex([
      page(start, [1, 2], start + 300),
      page(start + 300, [3], start + 600),
    ]);

    const result = await run(createArtemis(), podcastIndex);

    expect(podcastIndex.sinceCalls).toEqual([start]);
    expect(orm.state.events).toEqual([
      'send:1',
      'send:2',
      `advance:${start + 300}`,
      'send:3',
      `advance:${start + 600}`,
    ]);
    expect(orm.advance).toHaveBeenLastCalledWith({
      streamKey: 'recent_data',
      nextSince: start + 600,
      position: (start + 600) * 10,
    });
    expect(result).toMatchObject({
      outcome: 'caught_up',
      pages: 2,
      enqueued: 3,
      failed: 0,
      cursorNextSince: start + 600,
    });
  });

  it('looks up each page in one batch and skips feeds not in the database or blocked by lifecycle', async () => {
    orm.state.lifecycleRows = [
      { feedId: 11, podcastIndexId: 1, stateKey: FeedLifecycleStateKeyEnum.Active },
      { feedId: 12, podcastIndexId: 2, stateKey: FeedLifecycleStateKeyEnum.Archived },
      { feedId: 14, podcastIndexId: 4, stateKey: null },
    ];
    const start = NOW_SECONDS - SINCE_RANGE;
    savedCursor(start + RECENT_DATA_CURSOR_OVERLAP_SECONDS);

    const result = await run(
      createArtemis(),
      createPodcastIndex([page(start, [1, 2, 3, 4, 1], start + 120)])
    );

    expect(orm.listLifecycleByPodcastIndexIds).toHaveBeenCalledTimes(1);
    expect(orm.listLifecycleByPodcastIndexIds).toHaveBeenCalledWith([1, 2, 3, 4]);
    expect(orm.state.events.filter((event) => event.startsWith('send:'))).toEqual([
      'send:1',
      'send:4',
    ]);
    expect(result).toMatchObject({
      enqueued: 2,
      skippedNotInDb: 1,
      skippedBlockingLifecycle: 1,
      cursorNextSince: start + 120,
    });
  });

  it('stops without advancing past a page that had a failed send', async () => {
    knownFeeds([1, 2, 3, 4]);
    const start = NOW_SECONDS - SINCE_RANGE;
    savedCursor(start + RECENT_DATA_CURSOR_OVERLAP_SECONDS);
    const podcastIndex = createPodcastIndex([
      page(start, [1], start + 300),
      page(start + 300, [2, 3], start + 600),
      page(start + 600, [4], start + 840),
    ]);
    const loggerService = createLogger();

    const result = await run(createArtemis([2]), podcastIndex, loggerService);

    expect(orm.advance).toHaveBeenCalledTimes(1);
    expect(orm.state.cursor?.nextSince).toBe(start + 300);
    expect(podcastIndex.pagesRead()).toBe(2);
    expect(result).toMatchObject({
      outcome: 'send_failed',
      enqueued: 2,
      failed: 1,
      cursorNextSince: start + 300,
    });
    expect(loggerService.error).toHaveBeenCalledWith(
      expect.stringContaining('stopping without advancing the cursor')
    );
  });

  it('leaves the cursor at the last finished page when the time cap stops the run', async () => {
    knownFeeds([1]);
    const start = NOW_SECONDS - SINCE_RANGE;
    savedCursor(start + RECENT_DATA_CURSOR_OVERLAP_SECONDS);
    const loggerService = createLogger();

    const result = await run(
      createArtemis(),
      createPodcastIndex([page(start, [1], start + 300)], 'time_cap'),
      loggerService
    );

    expect(orm.state.cursor?.nextSince).toBe(start + 300);
    expect(result).toMatchObject({ outcome: 'time_cap', cursorNextSince: start + 300 });
    expect(loggerService.warn).toHaveBeenCalledWith(
      expect.stringContaining(`${NOW_SECONDS - (start + 300)}s behind`)
    );
  });

  it('leaves the cursor at the last finished page when Podcast Index returns an upstream error', async () => {
    knownFeeds([1]);
    const start = NOW_SECONDS - SINCE_RANGE;
    savedCursor(start + RECENT_DATA_CURSOR_OVERLAP_SECONDS);
    const loggerService = createLogger();

    const result = await run(
      createArtemis(),
      createPodcastIndex([page(start, [1], start + 300)], 'upstream_error'),
      loggerService
    );

    expect(orm.state.cursor?.nextSince).toBe(start + 300);
    expect(result).toMatchObject({ outcome: 'upstream_error', cursorNextSince: start + 300 });
    expect(loggerService.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'upstream error after retries; the next run resumes from next_since=' +
          `${start + 300}`
      )
    );
  });

  it('never moves the cursor backwards when a page reports an older nextSince', async () => {
    knownFeeds([1]);
    const cursorNextSince = NOW_SECONDS - 100;
    savedCursor(cursorNextSince, 7);
    const resumeSince = cursorNextSince - RECENT_DATA_CURSOR_OVERLAP_SECONDS;

    const result = await run(
      createArtemis(),
      createPodcastIndex([page(resumeSince, [1], cursorNextSince - 30)])
    );

    expect(orm.state.cursor?.nextSince).toBe(cursorNextSince);
    expect(result.cursorNextSince).toBe(cursorNextSince);
  });

  it('reads nothing when another run holds the stream lock', async () => {
    orm.state.lockAvailable = false;
    const podcastIndex = createPodcastIndex([page(NOW_SECONDS - 60, [1], NOW_SECONDS)]);
    const artemis = createArtemis();

    const result = await run(artemis, podcastIndex);

    expect(result.outcome).toBe('lock_held');
    expect(podcastIndex.sinceCalls).toEqual([]);
    expect(artemis.initialize).not.toHaveBeenCalled();
    expect(orm.advance).not.toHaveBeenCalled();
  });
});
