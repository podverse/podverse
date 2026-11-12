import { describe, expect, it } from 'vitest';

import type {
  LocalCatalog,
  V4EpisodeKey,
  V4LibrarySnapshot,
  V4PodcastKey,
} from './copyAccountLibraryLib.js';
import {
  classifyLibraryCopy,
  isSeedablePodcast,
  listPositionAt,
  matchedChannelIdTexts,
  parsePodcastIndexId,
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
    expect(report.followsPlaylist).toMatchObject({ total: 2, resolved: 1, unresolved: 1 });
    expect(report.followsUser).toMatchObject({ total: 1, resolved: 1, unresolved: 0 });
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
      settledChannelIdTexts: new Set(['podParsed']),
    });
    const stillParsing = catalog({ channelIdTexts: new Set(['podParsed']) });

    const finished = classifyLibraryCopy(listed, parsed);
    expect(finished.clips).toMatchObject({ total: 2, archivedItem: 1, snapshot: 1, unresolved: 0 });
    expect(finished.playlistMembers).toMatchObject({ total: 1, archivedItem: 1, unresolved: 0 });
    expect(finished.history).toMatchObject({ total: 1, dropped: 1, unresolved: 0 });

    const waiting = classifyLibraryCopy(listed, stillParsing);
    expect(waiting.clips.unresolved).toBe(2);
    expect(waiting.playlistMembers.unresolved).toBe(1);
    expect(waiting.history.unresolved).toBe(1);
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
    });
    expect(report.playlistOrderDropped).toBe(1);
  });

  it('keeps playback rows only for episodes still in a feed', () => {
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
      unresolved: 2,
      dropped: 3,
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
