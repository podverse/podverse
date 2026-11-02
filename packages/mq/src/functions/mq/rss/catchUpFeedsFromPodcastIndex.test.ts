import { beforeEach, describe, expect, it, vi } from 'vitest';

const orm = vi.hoisted(() => {
  type CursorState = {
    streamKey: string;
    nextSince: number;
    position: number | null;
    updatedAt: Date;
  };
  type SweepRow = {
    feedId: number;
    url: string;
    podcastIndexId: number;
    stateKey: string | null;
    lastFinishedParseTime: Date | null;
  };

  const state: {
    gapSweep: CursorState | null;
    lockAvailable: boolean;
    sweepRows: SweepRow[];
  } = { gapSweep: null, lockAvailable: true, sweepRows: [] };

  const listForGapSweep = vi.fn(async (params: { afterFeedId: number; limit: number }) =>
    state.sweepRows.filter((row) => row.feedId > params.afterFeedId).slice(0, params.limit)
  );
  const replace = vi.fn(
    async (params: { streamKey: string; nextSince: number; position: number | null }) => {
      state.gapSweep = { ...params, updatedAt: new Date() };
    }
  );
  const clear = vi.fn(async () => {
    state.gapSweep = null;
  });

  return { state, listForGapSweep, replace, clear };
});

vi.mock('@podverse/orm', () => {
  const blocking = new Set(['pending_archive', 'archived', 'merged', 'takedown']);
  return {
    PodcastIndexStreamKeyEnum: { RecentData: 'recent_data', GapSweep: 'gap_sweep' },
    lifecycleStateBlocksParseAndVisibility: (stateKey: string) => blocking.has(stateKey),
    FeedService: class {
      listForGapSweep = orm.listForGapSweep;
      listNewestItemByFeedIds = async () => [];
    },
    PodcastIndexStreamCursorService: class {
      get = async () => orm.state.gapSweep;
      replace = orm.replace;
      clear = orm.clear;
      withExclusiveRun = async <T>(_streamKey: string, run: () => Promise<T>) =>
        orm.state.lockAvailable ? { acquired: true, result: await run() } : { acquired: false };
    },
  };
});

import type { ActiveMQArtemisService } from '@queue/services/activeMQArtemis/index.js';

import type { PodcastIndexNewestEpisode } from '@podverse/external-services-podcast-index';
import { MQ_QUEUES } from '@podverse/helpers';
import type { ILoggerLike } from '@podverse/helpers-backend';
import type { FeedNewestItem } from '@podverse/orm';

import {
  decideGapSweepFeed,
  mqRSSCatchUpFromPodcastIndex,
} from './catchUpFeedsFromPodcastIndex.js';

const GAP_START_SECONDS = Math.floor(new Date('2026-10-30T15:10:00.000Z').getTime() / 1000);

function episode(overrides: Partial<PodcastIndexNewestEpisode> = {}): PodcastIndexNewestEpisode {
  return {
    feedId: 41504,
    guid: 'episode-277',
    enclosureUrl: 'https://example.com/277.mp3',
    datePublished: GAP_START_SECONDS + 3600,
    ...overrides,
  };
}

function newestItem(overrides: Partial<FeedNewestItem> = {}): FeedNewestItem {
  return {
    feedId: 7,
    guid: 'episode-276',
    enclosureUrl: 'https://example.com/276.mp3',
    pubDate: new Date((GAP_START_SECONDS - 86400) * 1000),
    ...overrides,
  };
}

describe('decideGapSweepFeed', () => {
  it('queues a feed whose newest Podcast Index guid is not our newest item', () => {
    expect(
      decideGapSweepFeed({
        episode: episode(),
        newestItem: newestItem(),
        lastFinishedParseTime: new Date(),
        gapStartSeconds: GAP_START_SECONDS,
      })
    ).toBe('queue_changed');
  });

  it('queues a feed we hold no dated item for', () => {
    expect(
      decideGapSweepFeed({
        episode: episode(),
        newestItem: null,
        lastFinishedParseTime: null,
        gapStartSeconds: GAP_START_SECONDS,
      })
    ).toBe('queue_changed');
  });

  it('skips a feed whose newest guid matches ours', () => {
    expect(
      decideGapSweepFeed({
        episode: episode(),
        newestItem: newestItem({ guid: 'episode-277', enclosureUrl: null }),
        lastFinishedParseTime: null,
        gapStartSeconds: GAP_START_SECONDS,
      })
    ).toBe('unchanged');
  });

  it('falls back to the enclosure URL when the guids do not match', () => {
    expect(
      decideGapSweepFeed({
        episode: episode({ guid: null }),
        newestItem: newestItem({ guid: null, enclosureUrl: 'https://example.com/277.mp3' }),
        lastFinishedParseTime: null,
        gapStartSeconds: GAP_START_SECONDS,
      })
    ).toBe('unchanged');
  });

  it('queues a feed Podcast Index lists nothing for when its last parse is older than the gap start', () => {
    const decide = (lastFinishedParseTime: Date | null) =>
      decideGapSweepFeed({
        episode: null,
        newestItem: newestItem(),
        lastFinishedParseTime,
        gapStartSeconds: GAP_START_SECONDS,
      });

    expect(decide(new Date((GAP_START_SECONDS - 1) * 1000))).toBe('queue_unlisted');
    expect(decide(null)).toBe('queue_unlisted');
    expect(decide(new Date((GAP_START_SECONDS + 60) * 1000))).toBe('unlisted_recently_parsed');
  });
});

describe('mqRSSCatchUpFromPodcastIndex', () => {
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

  function createArtemis(): Pick<ActiveMQArtemisService, 'initialize' | 'sendMessage' | 'close'> & {
    sentPodcastIndexIds: number[];
  } {
    const sentPodcastIndexIds: number[] = [];
    return {
      sentPodcastIndexIds,
      initialize: vi.fn(async () => {}),
      close: vi.fn(async () => {}),
      sendMessage: vi.fn(async (params: Parameters<ActiveMQArtemisService['sendMessage']>[0]) => {
        const { message } = params;
        if ('podcast_index_id' in message && typeof message.podcast_index_id === 'number') {
          sentPodcastIndexIds.push(message.podcast_index_id);
        }
      }),
    };
  }

  const podcastIndex = {
    episodesGetNewestByFeedIds: vi.fn(async (podcastIndexIds: readonly number[]) =>
      podcastIndexIds.map((feedId) => episode({ feedId }))
    ),
  };

  function run(
    artemis: ReturnType<typeof createArtemis>,
    sinceSeconds: number = GAP_START_SECONDS
  ) {
    return mqRSSCatchUpFromPodcastIndex(
      artemis,
      podcastIndex,
      {
        ...MQ_QUEUES['rss-normal'],
        sinceSeconds,
        closeAfterSend: true,
        loggerService: createLogger(),
      },
      msgOptions
    );
  }

  beforeEach(() => {
    orm.state.gapSweep = null;
    orm.state.lockAvailable = true;
    orm.state.sweepRows = [
      {
        feedId: 1,
        url: 'https://example.com/1.xml',
        podcastIndexId: 101,
        stateKey: 'active',
        lastFinishedParseTime: null,
      },
      {
        feedId: 2,
        url: 'https://example.com/2.xml',
        podcastIndexId: 102,
        stateKey: 'archived',
        lastFinishedParseTime: null,
      },
      {
        feedId: 3,
        url: 'https://example.com/3.xml',
        podcastIndexId: 103,
        stateKey: null,
        lastFinishedParseTime: null,
      },
    ];
    orm.listForGapSweep.mockClear();
    orm.replace.mockClear();
    orm.clear.mockClear();
    podcastIndex.episodesGetNewestByFeedIds.mockClear();
  });

  it('sweeps from the first feed, skips blocked lifecycle states, and clears progress when done', async () => {
    const artemis = createArtemis();

    const result = await run(artemis);

    expect(orm.replace).toHaveBeenCalledWith({
      streamKey: 'gap_sweep',
      nextSince: GAP_START_SECONDS,
      position: null,
    });
    expect(podcastIndex.episodesGetNewestByFeedIds).toHaveBeenCalledWith([101, 103], true);
    expect(artemis.sentPodcastIndexIds).toEqual([101, 103]);
    expect(orm.state.gapSweep).toBeNull();
    expect(result).toMatchObject({
      outcome: 'finished',
      resumed: false,
      enqueuedChanged: 2,
      skippedBlockingLifecycle: 1,
      lastFeedId: 3,
    });
  });

  it('continues an unfinished sweep for the same start time after its last swept feed', async () => {
    orm.state.gapSweep = {
      streamKey: 'gap_sweep',
      nextSince: GAP_START_SECONDS,
      position: 1,
      updatedAt: new Date(),
    };
    const artemis = createArtemis();

    const result = await run(artemis);

    expect(orm.replace).not.toHaveBeenCalled();
    expect(orm.listForGapSweep).toHaveBeenCalledWith(expect.objectContaining({ afterFeedId: 1 }));
    expect(artemis.sentPodcastIndexIds).toEqual([103]);
    expect(result).toMatchObject({ outcome: 'finished', resumed: true });
  });

  it('starts over from the first feed when the unfinished sweep has another start time', async () => {
    orm.state.gapSweep = {
      streamKey: 'gap_sweep',
      nextSince: GAP_START_SECONDS - 86400,
      position: 2,
      updatedAt: new Date(),
    };

    const result = await run(createArtemis());

    expect(orm.listForGapSweep).toHaveBeenCalledWith(expect.objectContaining({ afterFeedId: 0 }));
    expect(result).toMatchObject({ resumed: false, gapStartSeconds: GAP_START_SECONDS });
  });

  it('sweeps nothing when another run holds the lock', async () => {
    orm.state.lockAvailable = false;
    const artemis = createArtemis();

    const result = await run(artemis);

    expect(result).toEqual({ outcome: 'lock_held' });
    expect(artemis.initialize).not.toHaveBeenCalled();
    expect(orm.listForGapSweep).not.toHaveBeenCalled();
  });
});
