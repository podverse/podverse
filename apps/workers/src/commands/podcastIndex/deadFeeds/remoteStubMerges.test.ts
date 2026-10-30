import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IndexProvider, IndexProviderFeed, IndexProviderLookup } from '@podverse/helpers';

const mocks = vi.hoisted(() => ({
  listProviderFeedIds: vi.fn(async (_indexProvider: string): Promise<string[]> => []),
  getByProviderFeedId: vi.fn(
    async (_indexProvider: string, providerFeedId: string): Promise<{ id: number } | null> => ({
      id: Number(providerFeedId) * 10,
    })
  ),
  repointToFeed: vi.fn(async (_fromStubId: number, _feed: unknown): Promise<unknown> => ({})),
  deleteById: vi.fn(async (_id: number): Promise<boolean> => true),
  sleep: vi.fn(async (_ms: number): Promise<void> => undefined),
}));

vi.mock('@podverse/orm', () => ({
  RemoteChannelStubService: class {
    listProviderFeedIds = mocks.listProviderFeedIds;
    getByProviderFeedId = mocks.getByProviderFeedId;
    repointToFeed = mocks.repointToFeed;
    deleteById = mocks.deleteById;
  },
}));

vi.mock('@podverse/helpers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@podverse/helpers')>()),
  sleep: mocks.sleep,
}));

import {
  applyRemoteStubMerges,
  planRemoteStubMerges,
  REMOTE_STUB_MERGE_MAX_LOOKUPS_PER_RUN,
} from './remoteStubMerges.js';

function survivorFeed(providerFeedId: string, isDead = false): IndexProviderFeed {
  return {
    indexProvider: 'podcast_index',
    providerFeedId,
    feedGuid: null,
    feedUrl: `https://example.com/${providerFeedId}.xml`,
    title: 'Survivor',
    author: null,
    description: null,
    imageUrl: null,
    medium: 'podcast',
    isDead,
  };
}

/** A provider whose `getFeedById` answers from a fixed table; other methods are never called. */
function fakeProvider(lookups: Record<string, IndexProviderLookup<IndexProviderFeed>>) {
  const getFeedById = vi.fn(
    async (providerFeedId: string): Promise<IndexProviderLookup<IndexProviderFeed>> =>
      lookups[providerFeedId] ?? { status: 'not_found' }
  );
  const unused = async (): Promise<never> => {
    throw new Error('not used by the remote stub merge pass');
  };
  const provider: IndexProvider = {
    id: 'podcast_index',
    resolveFeed: unused,
    resolveFeedsByGuid: unused,
    getFeedById,
    resolveItem: unused,
  };
  return { provider, getFeedById };
}

describe('planRemoteStubMerges', () => {
  it('sorts each stub the dead-feed list names into re-point, survivor-parsed, or retired', () => {
    const targets = new Map<number, number | null>([
      [10, 100],
      [20, 200],
      [30, null],
      [40, 41],
      [41, 400],
      [50, 500],
    ]);

    const plan = planRemoteStubMerges({
      targets,
      stubPodcastIndexIds: new Set([10, 20, 30, 40, 60]),
      heldPodcastIndexIds: new Set([200]),
    });

    expect(plan).toEqual({
      repoint: [
        { fromPodcastIndexId: 10, toPodcastIndexId: 100 },
        { fromPodcastIndexId: 40, toPodcastIndexId: 400 },
      ],
      deleteSurvivorParsed: [20],
      deleteRetired: [30],
    });
  });
});

describe('applyRemoteStubMerges', () => {
  beforeEach(() => {
    mocks.listProviderFeedIds.mockReset();
    mocks.getByProviderFeedId.mockClear();
    mocks.repointToFeed.mockClear();
    mocks.deleteById.mockClear();
    mocks.sleep.mockClear();
  });

  it('writes nothing and looks nothing up in dry_run', async () => {
    mocks.listProviderFeedIds.mockResolvedValue(['10', '20', '30']);
    const { provider, getFeedById } = fakeProvider({});

    await applyRemoteStubMerges({
      targets: new Map([
        [10, 100],
        [20, 200],
        [30, null],
      ]),
      heldPodcastIndexIds: new Set([200]),
      mode: 'dry_run',
      provider,
      rateLimitDelayMs: 200,
    });

    expect(getFeedById).not.toHaveBeenCalled();
    expect(mocks.repointToFeed).not.toHaveBeenCalled();
    expect(mocks.deleteById).not.toHaveBeenCalled();
  });

  it('re-points to a live survivor, deletes for a dead or missing one, and leaves an unavailable one', async () => {
    mocks.listProviderFeedIds.mockResolvedValue(['10', '20', '30', '40', '50', '60', 'abc']);
    const live = survivorFeed('100');
    const { provider, getFeedById } = fakeProvider({
      '100': { status: 'found', value: live },
      '200': { status: 'found', value: survivorFeed('200', true) },
      '400': { status: 'unavailable' },
    });

    await applyRemoteStubMerges({
      targets: new Map<number, number | null>([
        [10, 100],
        [20, 200],
        [30, 300],
        [40, 400],
        [50, 500],
        [60, null],
      ]),
      heldPodcastIndexIds: new Set([500]),
      mode: 'apply',
      provider,
      rateLimitDelayMs: 200,
    });

    expect(getFeedById.mock.calls.map(([id]) => id)).toEqual(['100', '200', '300', '400']);
    expect(mocks.repointToFeed).toHaveBeenCalledTimes(1);
    expect(mocks.repointToFeed).toHaveBeenCalledWith(100, live);
    expect(mocks.deleteById.mock.calls.map(([id]) => id)).toEqual([200, 300, 500, 600]);

    expect(mocks.sleep).toHaveBeenCalledTimes(3);
    expect(mocks.sleep).toHaveBeenCalledWith(200);
  });

  it('stops looking up survivors at the per-run cap and leaves the rest for the next run', async () => {
    const total = REMOTE_STUB_MERGE_MAX_LOOKUPS_PER_RUN + 2;
    const targets = new Map<number, number | null>();
    for (let index = 1; index <= total; index += 1) {
      targets.set(index, 100000 + index);
    }
    mocks.listProviderFeedIds.mockResolvedValue([...targets.keys()].map(String));
    const { provider, getFeedById } = fakeProvider({});
    getFeedById.mockResolvedValue({ status: 'unavailable' });

    await applyRemoteStubMerges({
      targets,
      heldPodcastIndexIds: new Set(),
      mode: 'apply',
      provider,
      rateLimitDelayMs: 0,
    });

    expect(getFeedById).toHaveBeenCalledTimes(REMOTE_STUB_MERGE_MAX_LOOKUPS_PER_RUN);
    expect(mocks.repointToFeed).not.toHaveBeenCalled();
    expect(mocks.deleteById).not.toHaveBeenCalled();
  });
});
