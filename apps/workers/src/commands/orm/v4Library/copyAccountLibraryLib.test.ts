import { describe, expect, it } from 'vitest';

import type {
  LocalCatalog,
  V4EpisodeKey,
  V4LibrarySnapshot,
  V4PlaylistKey,
  V4PodcastKey,
} from './copyAccountLibraryLib.js';
import {
  ADD_BY_RSS_CAP,
  addByRssCopyPlan,
  classifyLibraryCopy,
  countAddByRssFeeds,
  countDirectoryFollows,
  decideMigrationCap,
  DIRECTORY_FOLLOW_CAP,
  directoryFollowCopyPlan,
  episodeDecision,
  isSeedablePodcast,
  libraryCopyErrorClass,
  listPositionAt,
  matchedChannelIdTexts,
  parsePodcastIndexId,
  playbackLegacyId,
  playbackPendingStatus,
  PLAYLIST_RESOURCE_LIMIT,
  playlistRowsSubjectToResourceLimit,
  shouldSetLibraryCopiedAt,
  subscriptionPendingStatus,
} from './copyAccountLibraryLib.js';

function catalog(overrides: Partial<LocalCatalog> = {}): LocalCatalog {
  return {
    channelIdTexts: new Set<string>(),
    channelByPodcastIndexId: new Map<number, string>(),
    channelByFeedUrl: new Map<string, string>(),
    channelByPodcastGuid: new Map<string, string>(),
    absorbSurvivorByPodcastIndexId: new Map<number, string>(),
    itemIdTexts: new Set<string>(),
    itemGuidsByChannel: new Map<string, Set<string>>(),
    itemEnclosuresByChannel: new Map<string, Set<string>>(),
    itemTitlePubByChannel: new Map<string, Set<string>>(),
    clipIdTexts: new Set<string>(),
    playlistIdTexts: new Set<string>(),
    accountIdTexts: new Set<string>(),
    feedUrls: new Set<string>(),
    attemptedChannelIdTexts: new Set<string>(),
    settledChannelIdTexts: new Set<string>(),
    ...overrides,
  };
}

function snapshot(overrides: Partial<V4LibrarySnapshot> = {}): V4LibrarySnapshot {
  return {
    podcastIds: [],
    podcasts: [],
    addByRssUrls: [],
    playlistFollowIds: [],
    userFollowIds: [],
    playlists: [],
    clips: [],
    mediaRefs: [],
    episodes: [],
    queue: [],
    history: [],
    nowPlaying: [],
    ...overrides,
  };
}

function podcast(id: string, overrides: Partial<V4PodcastKey> = {}): V4PodcastKey {
  return {
    id,
    podcastIndexId: null,
    podcastGuid: null,
    authorityUrl: `https://feeds.example/${id}`,
    isPublic: true,
    flagStatus: 'none',
    ...overrides,
  };
}

function episode(
  id: string,
  podcastId: string,
  overrides: Partial<V4EpisodeKey> = {}
): V4EpisodeKey {
  return {
    id,
    podcastId,
    guid: `${id}-guid`,
    mediaUrl: null,
    title: null,
    pubDate: null,
    isPublic: true,
    ...overrides,
  };
}

const emptyCount = {
  total: 0,
  resolved: 0,
  unresolved: 0,
  archivedItem: 0,
  snapshot: 0,
  notSeeded: 0,
  dropped: 0,
  pending: 0,
};

describe('parsePodcastIndexId', () => {
  it('keeps a decimal that fits the integer column', () => {
    expect(parsePodcastIndexId('920666')).toBe(920666);
    expect(parsePodcastIndexId('not-a-number')).toBeNull();
    expect(parsePodcastIndexId('2147483648')).toBeNull();
  });
});

describe('isSeedablePodcast', () => {
  it('seeds a public podcast with a Podcast Index id that is not spam or takedown', () => {
    expect(isSeedablePodcast(podcast('a', { podcastIndexId: '1' }))).toBe(true);
    expect(isSeedablePodcast(podcast('b', { podcastIndexId: '1', isPublic: false }))).toBe(false);
    expect(isSeedablePodcast(podcast('c', { podcastIndexId: '1', flagStatus: 'spam' }))).toBe(
      false
    );
    expect(isSeedablePodcast(podcast('d', { podcastIndexId: '1', flagStatus: 'takedown' }))).toBe(
      false
    );
    expect(isSeedablePodcast(podcast('e'))).toBe(false);
  });
});

describe('classifyLibraryCopy', () => {
  it('resolves a subscription by public id, absorb survivor, or feed url, and counts unseeded podcasts', () => {
    const local = catalog({
      channelIdTexts: new Set(['podPublic']),
      channelByFeedUrl: new Map([['https://feeds.example/show', 'fromUrl']]),
      absorbSurvivorByPodcastIndexId: new Map([[42, 'survivor']]),
      itemGuidsByChannel: new Map([['survivor', new Set(['episode-guid'])]]),
    });
    const report = classifyLibraryCopy(
      snapshot({
        podcastIds: ['podPublic', 'podAbsorbed', 'podUrl', 'podSeed', 'podHidden', 'missing', '  '],
        podcasts: [
          podcast('podPublic'),
          podcast('podAbsorbed', { podcastIndexId: '42' }),
          podcast('podUrl', { podcastIndexId: 'nope', authorityUrl: 'https://feeds.example/show' }),
          podcast('podSeed', { podcastIndexId: '7' }),
          podcast('podHidden', { podcastIndexId: '8', isPublic: false }),
        ],
        episodes: [episode('ep1', 'podAbsorbed', { guid: 'episode-guid' })],
        history: [{ episodeId: 'ep1', mediaRefId: null }],
      }),
      local
    );

    expect(report.subscriptions).toEqual({
      ...emptyCount,
      total: 7,
      resolved: 3,
      unresolved: 1,
      notSeeded: 2,
      dropped: 1,
      pending: 3,
    });
    expect(
      matchedChannelIdTexts(
        snapshot({ podcasts: [podcast('podAbsorbed', { podcastIndexId: '42' })] }),
        local
      )
    ).toEqual(['survivor']);
    expect(report.history.resolved).toBe(1);
  });

  it('counts add-by-rss urls and follows against local rows', () => {
    const report = classifyLibraryCopy(
      snapshot({
        addByRssUrls: ['https://feeds.example/a', '  ', 'https://feeds.example/missing'],
        playlistFollowIds: ['playlist1', 'missing-playlist'],
        userFollowIds: ['user1'],
      }),
      catalog({
        feedUrls: new Set(['https://feeds.example/a']),
        playlistIdTexts: new Set(['playlist1']),
        accountIdTexts: new Set(['user1']),
      })
    );

    expect(report.addByRss).toMatchObject({ total: 3, resolved: 1, unresolved: 1, dropped: 1 });
    expect(report.followsPlaylist).toMatchObject({
      total: 2,
      resolved: 1,
      unresolved: 1,
      pending: 0,
    });
    expect(report.followsUser).toMatchObject({ total: 1, resolved: 1, unresolved: 0, pending: 0 });
  });

  it('records a follow of an account that is not copied yet', () => {
    const report = classifyLibraryCopy(
      snapshot({ userFollowIds: ['user1', 'userLater'] }),
      catalog({ accountIdTexts: new Set(['user1']) })
    );

    expect(report.followsUser).toMatchObject({ total: 2, resolved: 1, unresolved: 1, pending: 1 });
  });

  it('never drops a user clip: waits on a parse, recreates an archived item, or keeps a snapshot', () => {
    const report = classifyLibraryCopy(
      snapshot({
        podcasts: [
          podcast('podSeed', { podcastIndexId: '7' }),
          podcast('podSpam', { podcastIndexId: '9', flagStatus: 'spam' }),
        ],
        episodes: [
          episode('epListed', 'podSeed'),
          episode('epLeftFeed', 'podSeed', { isPublic: false }),
          episode('epNoKeys', 'podSeed', { isPublic: false, guid: null }),
          episode('epSpam', 'podSpam'),
        ],
        clips: [
          { id: 'clipListed', episodeId: 'epListed', official: false, owned: true },
          { id: 'clipLeftFeed', episodeId: 'epLeftFeed', official: false, owned: true },
          { id: 'clipNoKeys', episodeId: 'epNoKeys', official: false, owned: true },
          { id: 'clipSpam', episodeId: 'epSpam', official: false, owned: true },
          { id: 'clipNoEpisode', episodeId: null, official: false, owned: true },
          { id: 'clipOfficial', episodeId: 'epListed', official: true, owned: true },
        ],
      }),
      catalog()
    );

    expect(report.clips).toEqual({
      ...emptyCount,
      total: 5,
      unresolved: 1,
      archivedItem: 1,
      snapshot: 3,
      pending: 4,
    });
    expect(report.clipsOfficialSkipped).toBe(1);
  });

  it('archives a listed episode once its feed parse has settled and still has no item', () => {
    const listed = snapshot({
      podcasts: [podcast('podParsed', { podcastIndexId: '7' })],
      episodes: [
        episode('epStillListed', 'podParsed'),
        episode('epNoKeys', 'podParsed', { guid: null, mediaUrl: null }),
      ],
      clips: [
        { id: 'clipListed', episodeId: 'epStillListed', official: false, owned: true },
        { id: 'clipNoKeys', episodeId: 'epNoKeys', official: false, owned: true },
      ],
      playlists: [
        {
          id: 'playlist1',
          episodeIds: ['epStillListed'],
          mediaRefIds: [],
          orderIds: [],
        },
      ],
      history: [{ episodeId: 'epStillListed', mediaRefId: null, orderChangedDate: null }],
    });
    const parsed = catalog({
      channelIdTexts: new Set(['podParsed']),
      attemptedChannelIdTexts: new Set(['podParsed']),
      settledChannelIdTexts: new Set(['podParsed']),
    });
    const stillParsing = catalog({ channelIdTexts: new Set(['podParsed']) });

    const finished = classifyLibraryCopy(listed, parsed);
    expect(finished.clips).toMatchObject({ total: 2, archivedItem: 1, snapshot: 1, unresolved: 0 });
    expect(finished.playlistMembers).toMatchObject({ total: 1, archivedItem: 1, unresolved: 0 });
    expect(finished.history).toMatchObject({ total: 1, dropped: 1, unresolved: 0, pending: 1 });

    const waiting = classifyLibraryCopy(listed, stillParsing);
    expect(waiting.clips.unresolved).toBe(2);
    expect(waiting.playlistMembers.unresolved).toBe(1);
    expect(waiting.history.unresolved).toBe(1);
  });

  it('archives clips once a parse was attempted, but holds playback until the feed is settled', () => {
    const listed = snapshot({
      podcasts: [podcast('podRetrying', { podcastIndexId: '7' })],
      episodes: [episode('epStillListed', 'podRetrying')],
      clips: [{ id: 'clipListed', episodeId: 'epStillListed', official: false, owned: true }],
      playlists: [
        { id: 'playlist1', episodeIds: ['epStillListed'], mediaRefIds: [], orderIds: [] },
      ],
      history: [{ episodeId: 'epStillListed', mediaRefId: null }],
      queue: [{ episodeId: 'epStillListed', mediaRefId: null }],
    });
    const attemptedOnly = catalog({
      channelIdTexts: new Set(['podRetrying']),
      attemptedChannelIdTexts: new Set(['podRetrying']),
    });

    const report = classifyLibraryCopy(listed, attemptedOnly);
    expect(report.clips).toMatchObject({ total: 1, archivedItem: 1, unresolved: 0, pending: 0 });
    expect(report.playlistMembers).toMatchObject({ total: 1, archivedItem: 1, pending: 0 });
    expect(report.history).toMatchObject({ total: 1, unresolved: 1, dropped: 0, pending: 1 });
    expect(report.queue).toMatchObject({ total: 1, unresolved: 1, dropped: 0, pending: 1 });
    expect(episodeDecision('epStillListed', listed, attemptedOnly, 'attempted')).toBe('archive');
    expect(episodeDecision('epStillListed', listed, attemptedOnly, 'settled')).toBe('waiting');
  });

  it('snapshots a clip whose show the seed skips for having no authority URL', () => {
    const report = classifyLibraryCopy(
      snapshot({
        podcastIds: ['podNoUrl'],
        podcasts: [podcast('podNoUrl', { podcastIndexId: '7', authorityUrl: null })],
        episodes: [episode('epLeftFeed', 'podNoUrl', { isPublic: false })],
        clips: [{ id: 'clipNoUrl', episodeId: 'epLeftFeed', official: false, owned: true }],
      }),
      catalog()
    );

    expect(report.clips).toMatchObject({ total: 1, snapshot: 1, archivedItem: 0 });
    expect(report.subscriptions).toMatchObject({ total: 1, notSeeded: 1, unresolved: 0 });
  });

  it('keeps playlist members the same way, waits on another user clip, and drops a dangling order id', () => {
    const report = classifyLibraryCopy(
      snapshot({
        podcasts: [podcast('podSeed', { podcastIndexId: '7' })],
        episodes: [
          episode('epLeftFeed', 'podSeed', { isPublic: false }),
          episode('epListed', 'podSeed'),
        ],
        playlists: [
          {
            id: 'list1',
            episodeIds: ['epLeftFeed', 'epGone'],
            mediaRefIds: ['clipMine', 'clipTheirs', 'clipOfficial'],
            orderIds: ['epLeftFeed', 'not-a-member'],
          },
        ],
        mediaRefs: [
          { id: 'clipMine', episodeId: null, official: false, owned: true },
          { id: 'clipTheirs', episodeId: 'epListed', official: false, owned: false },
          { id: 'clipOfficial', episodeId: 'epListed', official: true, owned: false },
        ],
      }),
      catalog()
    );

    expect(report.playlists).toMatchObject({ total: 1, resolved: 1 });
    expect(report.playlistMembers).toEqual({
      ...emptyCount,
      total: 5,
      unresolved: 1,
      archivedItem: 1,
      snapshot: 2,
      dropped: 1,
      pending: 2,
    });
    expect(report.playlistOrderDropped).toBe(1);
  });

  it('waits on playback while the feed is not settled and drops only rows that cannot match', () => {
    const report = classifyLibraryCopy(
      snapshot({
        podcasts: [podcast('podSeed', { podcastIndexId: '7' })],
        episodes: [
          episode('epListed', 'podSeed'),
          episode('epLeftFeed', 'podSeed', { isPublic: false }),
        ],
        mediaRefs: [{ id: 'clipMine', episodeId: 'epListed', official: false, owned: true }],
        history: [
          { episodeId: 'epListed', mediaRefId: null },
          { episodeId: 'epLeftFeed', mediaRefId: null },
          { episodeId: 'epGone', mediaRefId: null },
          { episodeId: null, mediaRefId: 'clipMine' },
          { episodeId: null, mediaRefId: null },
        ],
      }),
      catalog()
    );

    expect(report.history).toEqual({
      ...emptyCount,
      total: 5,
      unresolved: 3,
      dropped: 2,
      pending: 4,
    });
  });

  it('drops playback for an episode that left a settled feed', () => {
    const report = classifyLibraryCopy(
      snapshot({
        podcasts: [podcast('podSettled', { podcastIndexId: '7' })],
        episodes: [episode('epLeftFeed', 'podSettled', { isPublic: false })],
        nowPlaying: [{ episodeId: 'epLeftFeed', mediaRefId: null }],
      }),
      catalog({
        channelIdTexts: new Set(['podSettled']),
        attemptedChannelIdTexts: new Set(['podSettled']),
        settledChannelIdTexts: new Set(['podSettled']),
      })
    );

    expect(report.nowPlaying).toEqual({ ...emptyCount, total: 1, dropped: 1, pending: 1 });
  });
});

const LISTED_ADD_BY_RSS_TIERS = [200, 300, 400, 500, 1000, 10000];

type CapCase = {
  count: number;
  outcome: 'default' | 'tier' | 'needs_operator';
  tier?: number;
};

type AddByRssPlanCase = {
  count: number;
  stored: number | null;
  statusRowExists: boolean;
} & (
  | { action: 'copy'; writeTier: number | null; clearStored: boolean }
  | { action: 'needs_operator' | 'membership_status_missing' }
);

type ListedCapSpec = {
  readonly defaultLimit: number;
  readonly tiers: readonly number[];
};

function expectListedCap(spec: ListedCapSpec, row: CapCase): void {
  const decision = decideMigrationCap(row.count, spec);
  if (row.outcome === 'tier') {
    expect(decision).toEqual({ outcome: 'tier', tier: row.tier });
    return;
  }
  expect(decision).toEqual({ outcome: row.outcome });
}

describe('migration cap', () => {
  const addByRssCaps: CapCase[] = [
    { count: 0, outcome: 'default' },
    { count: 100, outcome: 'default' },
    { count: 101, outcome: 'tier', tier: 200 },
    { count: 200, outcome: 'tier', tier: 200 },
    { count: 201, outcome: 'tier', tier: 300 },
    { count: 300, outcome: 'tier', tier: 300 },
    { count: 301, outcome: 'tier', tier: 400 },
    { count: 400, outcome: 'tier', tier: 400 },
    { count: 401, outcome: 'tier', tier: 500 },
    { count: 500, outcome: 'tier', tier: 500 },
    { count: 501, outcome: 'tier', tier: 1000 },
    { count: 1000, outcome: 'tier', tier: 1000 },
    { count: 1001, outcome: 'tier', tier: 10000 },
    { count: 5215, outcome: 'tier', tier: 10000 },
    { count: 10000, outcome: 'tier', tier: 10000 },
    { count: 10001, outcome: 'needs_operator' },
  ];

  const directoryFollowCaps: CapCase[] = [
    { count: 0, outcome: 'default' },
    { count: 500, outcome: 'default' },
    { count: 501, outcome: 'tier', tier: 1000 },
    { count: 1000, outcome: 'tier', tier: 1000 },
    { count: 1001, outcome: 'tier', tier: 2000 },
    { count: 2000, outcome: 'tier', tier: 2000 },
    { count: 2001, outcome: 'tier', tier: 3000 },
    { count: 3000, outcome: 'tier', tier: 3000 },
    { count: 3001, outcome: 'tier', tier: 4000 },
    { count: 4000, outcome: 'tier', tier: 4000 },
    { count: 4001, outcome: 'tier', tier: 5000 },
    { count: 4314, outcome: 'tier', tier: 5000 },
    { count: 5000, outcome: 'tier', tier: 5000 },
    { count: 5001, outcome: 'tier', tier: 10000 },
    { count: 10000, outcome: 'tier', tier: 10000 },
    { count: 10001, outcome: 'needs_operator' },
  ];

  const addByRssPlans: AddByRssPlanCase[] = [
    {
      count: 150,
      stored: null,
      statusRowExists: true,
      action: 'copy',
      writeTier: 200,
      clearStored: false,
    },
    {
      count: 80,
      stored: null,
      statusRowExists: true,
      action: 'copy',
      writeTier: null,
      clearStored: false,
    },
    {
      count: 80,
      stored: null,
      statusRowExists: false,
      action: 'copy',
      writeTier: null,
      clearStored: false,
    },
    { count: 150, stored: null, statusRowExists: false, action: 'membership_status_missing' },
    {
      count: 150,
      stored: 200,
      statusRowExists: true,
      action: 'copy',
      writeTier: null,
      clearStored: false,
    },
    {
      count: 180,
      stored: 150,
      statusRowExists: true,
      action: 'copy',
      writeTier: 200,
      clearStored: false,
    },
    {
      count: 100,
      stored: 17,
      statusRowExists: true,
      action: 'copy',
      writeTier: null,
      clearStored: true,
    },
    {
      count: 80,
      stored: 50,
      statusRowExists: true,
      action: 'copy',
      writeTier: null,
      clearStored: true,
    },
    {
      count: 80,
      stored: 80,
      statusRowExists: true,
      action: 'copy',
      writeTier: null,
      clearStored: false,
    },
    {
      count: 100,
      stored: 100,
      statusRowExists: true,
      action: 'copy',
      writeTier: null,
      clearStored: false,
    },
    {
      count: 80,
      stored: 200,
      statusRowExists: true,
      action: 'copy',
      writeTier: null,
      clearStored: false,
    },
    {
      count: 40,
      stored: 15000,
      statusRowExists: true,
      action: 'copy',
      writeTier: null,
      clearStored: false,
    },
    {
      count: 101,
      stored: 50,
      statusRowExists: true,
      action: 'copy',
      writeTier: 200,
      clearStored: false,
    },
    {
      count: 101,
      stored: 100,
      statusRowExists: true,
      action: 'copy',
      writeTier: 200,
      clearStored: false,
    },
    {
      count: 150,
      stored: 100,
      statusRowExists: true,
      action: 'copy',
      writeTier: 200,
      clearStored: false,
    },
    {
      count: 10000,
      stored: null,
      statusRowExists: true,
      action: 'copy',
      writeTier: 10000,
      clearStored: false,
    },
    { count: 10001, stored: null, statusRowExists: true, action: 'needs_operator' },
    { count: 10001, stored: 10000, statusRowExists: true, action: 'needs_operator' },
    {
      count: 10001,
      stored: 10001,
      statusRowExists: true,
      action: 'copy',
      writeTier: null,
      clearStored: false,
    },
    {
      count: 10001,
      stored: 50000,
      statusRowExists: true,
      action: 'copy',
      writeTier: null,
      clearStored: false,
    },
  ];

  it('chooses the smallest add-by-rss tier that covers the count', () => {
    for (const row of addByRssCaps) {
      expectListedCap(ADD_BY_RSS_CAP, row);
    }
  });

  it('chooses the smallest directory-follow tier that covers the count', () => {
    for (const row of directoryFollowCaps) {
      expectListedCap(DIRECTORY_FOLLOW_CAP, row);
    }
  });

  it('reports a listed tier above the max for an operator', () => {
    expect(decideMigrationCap(15000, { defaultLimit: 100, tiers: [20000] })).toEqual({
      outcome: 'needs_operator',
    });
  });

  it('counts distinct canonical add-by-rss feeds', () => {
    expect(countAddByRssFeeds([])).toBe(0);
    expect(countAddByRssFeeds([''])).toBe(0);
    expect(countAddByRssFeeds(['   '])).toBe(0);
    expect(countAddByRssFeeds(['https://example.com/feed', 'https://example.com/feed'])).toBe(1);
    expect(countAddByRssFeeds(['https://example.com/feed', 'https://example.com/feed/'])).toBe(1);
    expect(
      countAddByRssFeeds(['https://user:pass@example.com/feed', 'https://example.com/feed'])
    ).toBe(1);
    expect(countAddByRssFeeds(['not a url'])).toBe(1);
  });

  it('counts directory follows per list', () => {
    expect(
      countDirectoryFollows({
        podcastIds: ['pod'],
        playlistFollowIds: ['list'],
        userFollowIds: ['user'],
      })
    ).toBe(3);
    expect(
      countDirectoryFollows({
        podcastIds: ['pod', '  ', ''],
        playlistFollowIds: [],
        userFollowIds: [],
      })
    ).toBe(1);
    expect(
      countDirectoryFollows({
        podcastIds: ['pod', 'pod'],
        playlistFollowIds: [],
        userFollowIds: [],
      })
    ).toBe(1);
    expect(
      countDirectoryFollows({
        podcastIds: ['same'],
        playlistFollowIds: [],
        userFollowIds: ['same'],
      })
    ).toBe(2);
  });

  it('plans an add-by-rss copy from the count and any stored cap', () => {
    for (const row of addByRssPlans) {
      const plan = addByRssCopyPlan(row.count, row.stored, row.statusRowExists);
      if (row.action === 'copy') {
        expect(plan).toEqual({
          action: 'copy',
          writeTier: row.writeTier,
          clearStored: row.clearStored,
        });
      } else {
        expect(plan).toEqual({ action: row.action });
        expect('writeTier' in plan).toBe(false);
        expect('clearStored' in plan).toBe(false);
      }
      if (plan.action === 'copy') {
        const listedTier =
          plan.writeTier === null || LISTED_ADD_BY_RSS_TIERS.includes(plan.writeTier);
        expect(listedTier).toBe(true);
        expect(plan.writeTier).not.toBe(100);
        if (typeof plan.writeTier === 'number') {
          expect(plan.clearStored).toBe(false);
        }
        if (plan.clearStored) {
          expect(plan.writeTier).toBeNull();
          expect(row.stored).not.toBeNull();
          expect(row.count).toBeLessThanOrEqual(100);
          if (row.stored !== null) {
            expect(row.stored).toBeLessThan(row.count);
          }
        }
      }
      if (row.stored !== null && row.stored >= row.count) {
        expect(plan).toEqual({ action: 'copy', writeTier: null, clearStored: false });
      }
    }
  });

  it('plans a directory-follow copy without a stored override', () => {
    expect(directoryFollowCopyPlan(500)).toEqual({
      action: 'copy',
      decision: { outcome: 'default' },
    });
    expect(directoryFollowCopyPlan(501)).toEqual({
      action: 'copy',
      decision: { outcome: 'tier', tier: 1000 },
    });
    expect(directoryFollowCopyPlan(4314)).toEqual({
      action: 'copy',
      decision: { outcome: 'tier', tier: 5000 },
    });
    expect(directoryFollowCopyPlan(10001)).toEqual({
      action: 'needs_operator',
      decision: { outcome: 'needs_operator' },
    });
  });
});

describe('pending row status', () => {
  it('maps a playback decision to unresolved while waiting and dropped otherwise', () => {
    expect(playbackPendingStatus('resolved')).toBeNull();
    expect(playbackPendingStatus('waiting')).toEqual({
      status: 'unresolved',
      reason: 'waiting_parse',
    });
    expect(playbackPendingStatus('archive')).toEqual({
      status: 'dropped',
      reason: 'episode_left_feed',
    });
    expect(playbackPendingStatus('gone')).toEqual({ status: 'dropped', reason: 'no_item' });
  });

  it('keys a playback row by its clip, then its episode', () => {
    expect(playbackLegacyId({ episodeId: 'ep1', mediaRefId: 'clip1' })).toBe('clip1');
    expect(playbackLegacyId({ episodeId: 'ep1', mediaRefId: '  ' })).toBe('ep1');
    expect(playbackLegacyId({ episodeId: null, mediaRefId: null })).toBeNull();
  });

  it('waits on a subscription the seed creates and records the rest as not seeded', () => {
    expect(subscriptionPendingStatus(podcast('podSeed', { podcastIndexId: '7' }))).toEqual({
      status: 'unresolved',
      reason: 'waiting_seed',
    });
    expect(subscriptionPendingStatus(podcast('podHidden', { isPublic: false }))).toEqual({
      status: 'dropped',
      reason: 'not_seeded',
    });
    expect(subscriptionPendingStatus(undefined)).toEqual({
      status: 'dropped',
      reason: 'not_seeded',
    });
  });
});

describe('list position', () => {
  it('steps by one hundred-millionth, toward zero for history', () => {
    expect(listPositionAt(1, 0)).toBe('1.00000000');
    expect(listPositionAt(1, 1)).toBe('1.00000001');
    expect(listPositionAt(-1, 0)).toBe('-1.00000000');
    expect(listPositionAt(-1, 1)).toBe('-0.99999999');
  });
});

describe('library copy group errors', () => {
  it('names a constraint and leaves the message out', () => {
    expect(
      libraryCopyErrorClass({
        constraint: 'playlist_resource_playlist_id_item_id_key',
        code: '23505',
        message: 'https://example.com/feed',
      })
    ).toBe('db_constraint:playlist_resource_playlist_id_item_id_key');
  });

  it('records a raised cap refusal', () => {
    expect(
      libraryCopyErrorClass({
        code: 'P0001',
        message: 'Playlist 9 cannot have more than 10000 resources',
      })
    ).toBe('cap_refused');
  });

  it('uses the sqlstate when no constraint is present', () => {
    expect(libraryCopyErrorClass({ code: '23503' })).toBe('db_constraint:23503');
  });

  it('names an error that has no database code', () => {
    expect(libraryCopyErrorClass(new TypeError('x'))).toBe('unexpected:TypeError');
  });

  it('names a non-error throw as unknown', () => {
    expect(libraryCopyErrorClass('nope')).toBe('unexpected:unknown');
  });

  it('sets the copied timestamp only when every group committed', () => {
    expect(shouldSetLibraryCopiedAt({ groupErrors: [], needsOperatorGroups: [] })).toBe(true);
    expect(
      shouldSetLibraryCopiedAt({
        groupErrors: [{ class: 'cap_refused' }],
        needsOperatorGroups: [],
      })
    ).toBe(false);
    expect(shouldSetLibraryCopiedAt({ groupErrors: [], needsOperatorGroups: ['playlists'] })).toBe(
      false
    );
    expect(
      shouldSetLibraryCopiedAt({
        groupErrors: [{ class: 'cap_refused' }],
        needsOperatorGroups: ['playlists'],
      })
    ).toBe(false);
  });
});

describe('playlist resource limit', () => {
  const noMediaRefs = new Map<string, { official: boolean }>();

  function episodeIds(count: number): string[] {
    return Array.from({ length: count }, (_, index) => `ep${index}`);
  }

  function playlist(overrides: Partial<V4PlaylistKey> = {}): V4PlaylistKey {
    return {
      id: 'pl1',
      episodeIds: [],
      mediaRefIds: [],
      orderIds: [],
      ...overrides,
    };
  }

  it('counts 10000 episodes as within the limit and 10001 as over it', () => {
    expect(PLAYLIST_RESOURCE_LIMIT).toBe(10000);
    expect(
      playlistRowsSubjectToResourceLimit(
        playlist({ id: 'within', episodeIds: episodeIds(10000) }),
        noMediaRefs
      )
    ).toBe(10000);
    expect(
      playlistRowsSubjectToResourceLimit(
        playlist({ id: 'over', episodeIds: episodeIds(10001) }),
        noMediaRefs
      )
    ).toBe(10001);
  });

  it('does not count a blank episode id', () => {
    expect(
      playlistRowsSubjectToResourceLimit(playlist({ episodeIds: ['', '  ', 'ep1'] }), noMediaRefs)
    ).toBe(1);
  });

  it('counts a duplicate episode id once', () => {
    expect(
      playlistRowsSubjectToResourceLimit(
        playlist({ episodeIds: ['ep1', 'ep1'], orderIds: ['ep1', 'ep1'] }),
        noMediaRefs
      )
    ).toBe(1);
  });

  it('ignores an order entry that is not an episode or a clip on the playlist', () => {
    expect(
      playlistRowsSubjectToResourceLimit(
        playlist({ episodeIds: ['ep1'], orderIds: ['not-a-member', 'ep1'] }),
        noMediaRefs
      )
    ).toBe(1);
  });

  it('skips an official clip and a clip with no media ref', () => {
    const mediaRefs = new Map<string, { official: boolean }>([
      ['officialClip', { official: true }],
      ['realClip', { official: false }],
    ]);
    expect(
      playlistRowsSubjectToResourceLimit(
        playlist({ mediaRefIds: ['officialClip'], orderIds: ['officialClip'] }),
        mediaRefs
      )
    ).toBe(0);
    expect(
      playlistRowsSubjectToResourceLimit(
        playlist({ mediaRefIds: ['missingClip'], orderIds: ['missingClip'] }),
        mediaRefs
      )
    ).toBe(0);
    expect(
      playlistRowsSubjectToResourceLimit(
        playlist({ mediaRefIds: ['realClip'], orderIds: ['realClip'] }),
        mediaRefs
      )
    ).toBe(1);
  });

  it('counts one playlist without changing another playlist passed separately', () => {
    const over = playlist({ id: 'over', episodeIds: episodeIds(10001) });
    const other = playlist({ id: 'other', episodeIds: ['epA', 'epB'] });
    expect(playlistRowsSubjectToResourceLimit(over, noMediaRefs)).toBe(10001);
    expect(playlistRowsSubjectToResourceLimit(other, noMediaRefs)).toBe(2);
  });
});
