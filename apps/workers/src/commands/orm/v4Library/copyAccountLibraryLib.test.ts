import { describe, expect, it } from 'vitest';

import type { LocalCatalog, V4LibrarySnapshot } from './copyAccountLibraryLib.js';
import {
  classifyLibraryCopy,
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

describe('parsePodcastIndexId', () => {
  it('keeps a decimal that fits the integer column', () => {
    expect(parsePodcastIndexId('920666')).toBe(920666);
    expect(parsePodcastIndexId('not-a-number')).toBeNull();
    expect(parsePodcastIndexId('2147483648')).toBeNull();
  });
});

describe('classifyLibraryCopy', () => {
  it('resolves a subscription by public id, absorb survivor, or feed url, and leaves a missing podcast unresolved', () => {
    const local = catalog({
      channelIdTexts: new Set(['podPublic']),
      channelByFeedUrl: new Map([['https://feeds.example/show', 'fromUrl']]),
      absorbSurvivorByPodcastIndexId: new Map([[42, 'survivor']]),
      itemGuidsByChannel: new Map([['survivor', new Set(['episode-guid'])]]),
    });
    const report = classifyLibraryCopy(
      snapshot({
        podcastIds: ['podPublic', 'podAbsorbed', 'podUrl', 'missing', '  '],
        podcasts: [
          { id: 'podPublic', podcastIndexId: null, podcastGuid: null, authorityUrl: null },
          {
            id: 'podAbsorbed',
            podcastIndexId: '42',
            podcastGuid: null,
            authorityUrl: null,
          },
          {
            id: 'podUrl',
            podcastIndexId: 'nope',
            podcastGuid: null,
            authorityUrl: 'https://feeds.example/show',
          },
        ],
        episodes: [
          {
            id: 'ep1',
            podcastId: 'podAbsorbed',
            guid: 'episode-guid',
            mediaUrl: null,
            title: null,
            pubDate: null,
          },
        ],
        history: [{ episodeId: 'ep1', mediaRefId: null }],
      }),
      local
    );

    expect(report.subscriptions).toEqual({
      total: 5,
      resolved: 3,
      unresolved: 1,
      keptWithoutItem: 0,
      dropped: 1,
    });
    expect(
      matchedChannelIdTexts(
        snapshot({
          podcasts: [
            { id: 'podAbsorbed', podcastIndexId: '42', podcastGuid: null, authorityUrl: null },
          ],
        }),
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

  it('keeps a user clip whose episode is gone, skips an official clip, and drops a dangling order id', () => {
    const report = classifyLibraryCopy(
      snapshot({
        playlists: [
          {
            id: 'list1',
            episodeIds: ['ep-missing-local'],
            mediaRefIds: ['clip-user', 'clip-official'],
            orderIds: ['ep-missing-local', 'not-a-member'],
          },
        ],
        clips: [
          { id: 'clip-user', episodeId: null, official: false },
          { id: 'clip-official', episodeId: 'ep1', official: true },
          { id: 'clip-waiting', episodeId: 'ep-missing-local', official: false },
        ],
        mediaRefs: [
          { id: 'clip-user', episodeId: null, official: false },
          { id: 'clip-official', episodeId: 'ep1', official: true },
        ],
        episodes: [
          {
            id: 'ep-missing-local',
            podcastId: 'pod-missing',
            guid: 'guid-1',
            mediaUrl: null,
            title: 'Show',
            pubDate: '2020-01-01T00:00:00.000Z',
          },
        ],
        queue: [
          { episodeId: null, mediaRefId: null },
          { episodeId: null, mediaRefId: 'clip-user' },
        ],
        nowPlaying: [],
      }),
      catalog()
    );

    expect(report.playlists).toMatchObject({ total: 1, resolved: 1, unresolved: 0 });
    expect(report.playlistMembers).toEqual({
      total: 3,
      resolved: 0,
      unresolved: 1,
      keptWithoutItem: 1,
      dropped: 1,
    });
    expect(report.playlistOrderDropped).toBe(1);
    expect(report.clips).toEqual({
      total: 2,
      resolved: 0,
      unresolved: 1,
      keptWithoutItem: 1,
      dropped: 0,
    });
    expect(report.clipsOfficialSkipped).toBe(1);
    expect(report.queue).toEqual({
      total: 2,
      resolved: 0,
      unresolved: 0,
      keptWithoutItem: 1,
      dropped: 1,
    });
    expect(report.nowPlaying.total).toBe(0);
  });
});
