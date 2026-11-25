import { describe, expect, it, vi } from 'vitest';

import type { IndexProviderFeed, IndexProviderLookup } from '@podverse/helpers';

import { collectCatalogAllowlistAddTargets } from './collectCatalogAllowlistAddTargets.js';

function feed(
  providerFeedId: string,
  feedUrl: string,
  isDead: boolean,
  title: string | null = null
): IndexProviderLookup<IndexProviderFeed> {
  return {
    status: 'found',
    value: {
      indexProvider: 'podcast_index',
      providerFeedId,
      feedGuid: null,
      feedUrl,
      title,
      author: null,
      description: null,
      imageUrl: null,
      medium: null,
      isDead,
    },
  };
}

function live(id: number, feedUrl: string, title: string | null = null): IndexProviderLookup<IndexProviderFeed> {
  return feed(String(id), feedUrl, false, title);
}

function dead(id: number, feedUrl: string): IndexProviderLookup<IndexProviderFeed> {
  return feed(String(id), feedUrl, true);
}

async function collect(params: {
  allowlist: readonly number[];
  stored?: readonly number[];
  lookups: ReadonlyMap<string, IndexProviderLookup<IndexProviderFeed>>;
  dead?: ReadonlyMap<number, number | null>;
}) {
  const getFeedById = vi.fn(async (id: string) => {
    const lookup = params.lookups.get(id);
    if (lookup === undefined) {
      throw new Error(`unexpected lookup ${id}`);
    }
    return lookup;
  });
  const loadDeadFeedTargets = vi.fn(async () => params.dead ?? new Map<number, number | null>());
  const plan = await collectCatalogAllowlistAddTargets({
    allowlist: params.allowlist,
    storedPodcastIndexIds: new Set(params.stored ?? []),
    indexProvider: { getFeedById },
    loadDeadFeedTargets,
    sleepBetweenLookups: async () => {},
  });
  return { plan, getFeedById, loadDeadFeedTargets };
}

describe('collectCatalogAllowlistAddTargets', () => {
  it('skips stored listed ids without looking them up', async () => {
    const { plan, getFeedById, loadDeadFeedTargets } = await collect({
      allowlist: [10, 11],
      stored: [10, 11],
      lookups: new Map(),
    });

    expect(plan).toEqual({ targets: [], records: [], unavailable: [], unresolved: [] });
    expect(getFeedById).not.toHaveBeenCalled();
    expect(loadDeadFeedTargets).not.toHaveBeenCalled();
  });

  it('adds a live unstored listed id and does not load the dead-feed CSV', async () => {
    const { plan, loadDeadFeedTargets } = await collect({
      allowlist: [10],
      lookups: new Map([['10', live(10, 'https://live.example/feed.xml', 'Live Show')]]),
    });

    expect(plan).toEqual({
      targets: [
        {
          podcastIndexId: 10,
          feedUrl: 'https://live.example/feed.xml',
          sourcePodcastIndexId: 10,
        },
      ],
      records: [
        {
          listedPodcastIndexId: 10,
          resolvedPodcastIndexId: null,
          title: 'Live Show',
          feedUrl: 'https://live.example/feed.xml',
        },
      ],
      unavailable: [],
      unresolved: [],
    });
    expect(loadDeadFeedTargets).not.toHaveBeenCalled();
  });

  it('enqueues the id in the directory body when it differs from the listed id', async () => {
    const { plan, loadDeadFeedTargets } = await collect({
      allowlist: [10],
      lookups: new Map([['10', live(20, 'https://moved.example/feed.xml', 'Moved Show')]]),
    });

    expect(plan.targets).toEqual([
      {
        podcastIndexId: 20,
        feedUrl: 'https://moved.example/feed.xml',
        sourcePodcastIndexId: 10,
      },
    ]);
    expect(plan.records).toEqual([
      {
        listedPodcastIndexId: 10,
        resolvedPodcastIndexId: 20,
        title: 'Moved Show',
        feedUrl: 'https://moved.example/feed.xml',
      },
    ]);
    expect(loadDeadFeedTargets).not.toHaveBeenCalled();
  });

  it('adds the surviving show when a listed id was merged', async () => {
    const { plan, loadDeadFeedTargets } = await collect({
      allowlist: [10],
      lookups: new Map([
        ['10', dead(10, 'https://dead.example/feed.xml')],
        ['20', live(20, 'https://survivor.example/feed.xml', 'Survivor')],
      ]),
      dead: new Map([[10, 20]]),
    });

    expect(plan.targets).toEqual([
      {
        podcastIndexId: 20,
        feedUrl: 'https://survivor.example/feed.xml',
        sourcePodcastIndexId: 10,
      },
    ]);
    expect(plan.records).toEqual([
      {
        listedPodcastIndexId: 10,
        resolvedPodcastIndexId: 20,
        title: 'Survivor',
        feedUrl: 'https://survivor.example/feed.xml',
      },
    ]);
    expect(plan.unavailable).toEqual([]);
    expect(plan.unresolved).toEqual([]);
    expect(loadDeadFeedTargets).toHaveBeenCalledTimes(1);
  });

  it('walks a merge chain to the live show', async () => {
    const { plan, getFeedById } = await collect({
      allowlist: [10],
      lookups: new Map([
        ['10', dead(10, 'https://dead.example/feed.xml')],
        ['30', live(30, 'https://survivor.example/feed.xml')],
      ]),
      dead: new Map<number, number | null>([
        [10, 20],
        [20, 30],
      ]),
    });

    expect(plan.targets).toEqual([
      {
        podcastIndexId: 30,
        feedUrl: 'https://survivor.example/feed.xml',
        sourcePodcastIndexId: 10,
      },
    ]);
    expect(plan.records[0]?.resolvedPodcastIndexId).toBe(30);
    expect(getFeedById).not.toHaveBeenCalledWith('20');
  });

  it('adds no extra target when the survivor is already stored or itself listed', async () => {
    const storedSurvivor = await collect({
      allowlist: [10],
      stored: [20],
      lookups: new Map([['10', dead(10, 'https://dead.example/feed.xml')]]),
      dead: new Map([[10, 20]]),
    });
    expect(storedSurvivor.plan.targets).toEqual([]);
    expect(storedSurvivor.plan.records).toEqual([
      {
        listedPodcastIndexId: 10,
        resolvedPodcastIndexId: 20,
        title: null,
        feedUrl: null,
      },
    ]);
    expect(storedSurvivor.getFeedById).toHaveBeenCalledTimes(1);
    expect(storedSurvivor.getFeedById).toHaveBeenCalledWith('10');

    const listedSurvivor = await collect({
      allowlist: [10, 20],
      lookups: new Map([
        ['10', dead(10, 'https://dead.example/feed.xml')],
        ['20', live(20, 'https://live.example/feed.xml')],
      ]),
      dead: new Map([[10, 20]]),
    });
    expect(listedSurvivor.plan.targets).toEqual([
      {
        podcastIndexId: 20,
        feedUrl: 'https://live.example/feed.xml',
        sourcePodcastIndexId: 20,
      },
    ]);
    expect(listedSurvivor.plan.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          listedPodcastIndexId: 10,
          resolvedPodcastIndexId: 20,
        }),
        expect.objectContaining({
          listedPodcastIndexId: 20,
          resolvedPodcastIndexId: null,
        }),
      ])
    );
  });

  it('enqueues one target when two listed ids merged into the same show', async () => {
    const { plan, getFeedById } = await collect({
      allowlist: [10, 11],
      lookups: new Map([
        ['10', dead(10, 'https://dead-10.example/feed.xml')],
        ['11', dead(11, 'https://dead-11.example/feed.xml')],
        ['20', live(20, 'https://survivor.example/feed.xml')],
      ]),
      dead: new Map<number, number | null>([
        [10, 20],
        [11, 20],
      ]),
    });

    expect(plan.targets).toEqual([
      {
        podcastIndexId: 20,
        feedUrl: 'https://survivor.example/feed.xml',
        sourcePodcastIndexId: 10,
      },
    ]);
    expect(plan.records.map((record) => record.listedPodcastIndexId).sort()).toEqual([10, 11]);
    expect(getFeedById).toHaveBeenCalledTimes(3);
  });

  it('records a not_found listed id with no dead-feed row as unresolved', async () => {
    const { plan, loadDeadFeedTargets } = await collect({
      allowlist: [10],
      lookups: new Map([['10', { status: 'not_found' }]]),
      dead: new Map(),
    });

    expect(plan).toEqual({ targets: [], records: [], unavailable: [], unresolved: [10] });
    expect(loadDeadFeedTargets).toHaveBeenCalledTimes(1);
  });

  it('records an unavailable lookup and does not load the CSV when nothing needs a survivor', async () => {
    const { plan, loadDeadFeedTargets } = await collect({
      allowlist: [10],
      lookups: new Map([['10', { status: 'unavailable' }]]),
    });

    expect(plan).toEqual({ targets: [], records: [], unavailable: [10], unresolved: [] });
    expect(loadDeadFeedTargets).not.toHaveBeenCalled();
  });
});
