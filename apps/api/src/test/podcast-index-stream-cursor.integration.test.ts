import type { Server } from 'http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ORMContext } from '@podverse/orm';

import { startTestApp, stopTestApp } from './helpers/index.js';

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
  };
});

type OrmApi = {
  PodcastIndexStreamCursorService: typeof import('@podverse/orm').PodcastIndexStreamCursorService;
  PodcastIndexStreamKeyEnum: typeof import('@podverse/orm').PodcastIndexStreamKeyEnum;
  FeedService: typeof import('@podverse/orm').FeedService;
  Feed: typeof import('@podverse/orm').Feed;
  FeedLifecycleStateKeyEnum: typeof import('@podverse/orm').FeedLifecycleStateKeyEnum;
  FeedLifecycleUpdateSourceEnum: typeof import('@podverse/orm').FeedLifecycleUpdateSourceEnum;
};

let seed = 0;

function nextRunId(): number {
  seed += 1;
  return Date.now() + seed;
}

function podcastIndexId(runId: number, slot: number): number {
  return 820_000_000 + (runId % 100_000_000) + slot;
}

describe('Podcast Index stream cursor and batch feed lookup', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let orm: OrmApi;

  beforeAll(async () => {
    const started = await startTestApp();
    server = started.server;
    ormContext = started.ormContext;
    if (!ormContext) {
      throw new Error('ORM context required for the stream cursor integration test');
    }
    const loaded = await import('@podverse/orm');
    orm = {
      PodcastIndexStreamCursorService: loaded.PodcastIndexStreamCursorService,
      PodcastIndexStreamKeyEnum: loaded.PodcastIndexStreamKeyEnum,
      FeedService: loaded.FeedService,
      Feed: loaded.Feed,
      FeedLifecycleStateKeyEnum: loaded.FeedLifecycleStateKeyEnum,
      FeedLifecycleUpdateSourceEnum: loaded.FeedLifecycleUpdateSourceEnum,
    };
  }, 120000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  beforeEach(async () => {
    if (!ormContext) {
      throw new Error('ORM context required');
    }
    await ormContext.dataSourceReadWrite.manager.query(
      `DELETE FROM podcast_index_stream_cursor WHERE stream_key = $1`,
      [orm.PodcastIndexStreamKeyEnum.RecentData]
    );
  });

  it('creates the cursor on the first advance and reads it back', async () => {
    const service = new orm.PodcastIndexStreamCursorService();
    const streamKey = orm.PodcastIndexStreamKeyEnum.RecentData;

    expect(await service.get(streamKey)).toBeNull();

    const saved = await service.advance({ streamKey, nextSince: 1_793_000_000, position: 42 });

    expect(saved).toMatchObject({ streamKey, nextSince: 1_793_000_000, position: 42 });
    expect(await service.get(streamKey)).toMatchObject({ nextSince: 1_793_000_000, position: 42 });
  });

  it('moves the cursor forward and never backwards', async () => {
    const service = new orm.PodcastIndexStreamCursorService();
    const streamKey = orm.PodcastIndexStreamKeyEnum.RecentData;

    await service.advance({ streamKey, nextSince: 1_793_000_000, position: 42 });
    const forward = await service.advance({ streamKey, nextSince: 1_793_000_300, position: 50 });
    const backward = await service.advance({ streamKey, nextSince: 1_792_999_000, position: 10 });

    expect(forward).toMatchObject({ nextSince: 1_793_000_300, position: 50 });
    expect(backward).toMatchObject({ nextSince: 1_793_000_300, position: 50 });
  });

  it('keeps the stored position when an advance has none', async () => {
    const service = new orm.PodcastIndexStreamCursorService();
    const streamKey = orm.PodcastIndexStreamKeyEnum.RecentData;

    await service.advance({ streamKey, nextSince: 1_793_000_000, position: 42 });
    const saved = await service.advance({ streamKey, nextSince: 1_793_000_060, position: null });

    expect(saved).toMatchObject({ nextSince: 1_793_000_060, position: 42 });
  });

  it('lets only one run hold the stream at a time and frees it afterwards', async () => {
    const service = new orm.PodcastIndexStreamCursorService();
    const streamKey = orm.PodcastIndexStreamKeyEnum.RecentData;

    const outer = await service.withExclusiveRun(streamKey, async () =>
      new orm.PodcastIndexStreamCursorService().withExclusiveRun(streamKey, async () => 'inner')
    );
    const after = await service.withExclusiveRun(streamKey, async () => 'after');

    expect(outer).toEqual({ acquired: true, result: { acquired: false } });
    expect(after).toEqual({ acquired: true, result: 'after' });
  });

  it('frees the stream when the run throws', async () => {
    const service = new orm.PodcastIndexStreamCursorService();
    const streamKey = orm.PodcastIndexStreamKeyEnum.RecentData;

    await expect(
      service.withExclusiveRun(streamKey, async () => {
        throw new Error('run failed');
      })
    ).rejects.toThrow('run failed');

    expect(await service.withExclusiveRun(streamKey, async () => 'next')).toEqual({
      acquired: true,
      result: 'next',
    });
  });

  it('looks up lifecycle state for many Podcast Index ids in one call', async () => {
    if (!ormContext) {
      throw new Error('ORM context required');
    }
    const runId = nextRunId();
    const feedRepo = ormContext.dataSourceReadWrite.manager.getRepository(orm.Feed);
    const activeFeed = await feedRepo.save(
      feedRepo.create({
        url: `https://stream-cursor-${runId}-a.example.com/feed.xml`,
        podcast_index_id: podcastIndexId(runId, 1),
      })
    );
    const archivedFeed = await feedRepo.save(
      feedRepo.create({
        url: `https://stream-cursor-${runId}-b.example.com/feed.xml`,
        podcast_index_id: podcastIndexId(runId, 2),
      })
    );
    const feedService = new orm.FeedService();
    await feedService.setFeedLifecycleState(archivedFeed.id, {
      toStateKey: orm.FeedLifecycleStateKeyEnum.PendingArchive,
      source: orm.FeedLifecycleUpdateSourceEnum.Archiver,
    });
    await feedService.setFeedLifecycleState(archivedFeed.id, {
      toStateKey: orm.FeedLifecycleStateKeyEnum.Archived,
      source: orm.FeedLifecycleUpdateSourceEnum.Archiver,
    });

    const rows = await feedService.listLifecycleByPodcastIndexIds([
      podcastIndexId(runId, 1),
      podcastIndexId(runId, 2),
      podcastIndexId(runId, 3),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows).toEqual(
      expect.arrayContaining([
        {
          feedId: activeFeed.id,
          podcastIndexId: podcastIndexId(runId, 1),
          stateKey: orm.FeedLifecycleStateKeyEnum.Active,
        },
        {
          feedId: archivedFeed.id,
          podcastIndexId: podcastIndexId(runId, 2),
          stateKey: orm.FeedLifecycleStateKeyEnum.Archived,
        },
      ])
    );
  });
});
