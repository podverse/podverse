import { describe, expect, it } from 'vitest';

import type { LocalCatalog, V4PodcastKey } from '../v4Library/copyAccountLibraryLib.js';
import type { CatalogSeedBucket, CatalogSeedSources } from './seedAccountCatalogLib.js';
import { classifyAccountCatalogSeed, selectCatalogSeedCreates } from './seedAccountCatalogLib.js';

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
    attemptedChannelIdTexts: new Set<string>(),
    settledChannelIdTexts: new Set<string>(),
    feedUrls: new Set<string>(),
    ...overrides,
  };
}

function podcast(id: string, overrides: Partial<V4PodcastKey> = {}): V4PodcastKey {
  return {
    id,
    podcastIndexId: '1',
    podcastGuid: null,
    authorityUrl: null,
    isPublic: true,
    flagStatus: 'none',
    ...overrides,
  };
}

function bucket(overrides: Partial<CatalogSeedBucket> = {}): CatalogSeedBucket {
  return {
    total: 0,
    alreadyLocal: 0,
    notLocal: 0,
    missing: 0,
    nonPublic: 0,
    spam: 0,
    takedown: 0,
    noPodcastIndexId: 0,
    ...overrides,
  };
}

function sources(overrides: Partial<CatalogSeedSources> = {}): CatalogSeedSources {
  return {
    subscriptions: [],
    clips: [],
    playlistMembers: [],
    history: [],
    queue: [],
    nowPlaying: [],
    ...overrides,
  };
}

describe('classifyAccountCatalogSeed', () => {
  it('splits seedable shows from ones the seed skips, and counts a local channel once', () => {
    const report = classifyAccountCatalogSeed(
      sources({
        subscriptions: [
          'local',
          'absorbed',
          'seed',
          'hidden',
          'spam',
          'down',
          'noindex',
          'missing',
          ' ',
          'local',
        ],
        clips: ['seed', 'extra'],
        history: ['extra', 'historyOnly'],
      }),
      [
        podcast('local'),
        podcast('absorbed', { podcastIndexId: '42' }),
        podcast('seed', { podcastIndexId: '7' }),
        podcast('hidden', { isPublic: false }),
        podcast('spam', { flagStatus: 'spam' }),
        podcast('down', { flagStatus: 'takedown' }),
        podcast('noindex', { podcastIndexId: null }),
        podcast('extra', { podcastIndexId: '9' }),
        podcast('historyOnly', { podcastIndexId: '10', isPublic: false }),
      ],
      catalog({
        channelIdTexts: new Set(['local']),
        absorbSurvivorByPodcastIndexId: new Map([[42, 'survivor']]),
      })
    );

    expect(report.subscriptions).toEqual(
      bucket({
        total: 8,
        alreadyLocal: 2,
        notLocal: 1,
        missing: 1,
        nonPublic: 1,
        spam: 1,
        takedown: 1,
        noPodcastIndexId: 1,
      })
    );
    expect(report.clips).toEqual(bucket({ total: 2, notLocal: 2 }));
    expect(report.history).toEqual(bucket({ total: 2, notLocal: 1, nonPublic: 1 }));
    expect(report.playlistMembers).toEqual(bucket());
    expect(report.queue).toEqual(bucket());
    expect(report.nowPlaying).toEqual(bucket());
    expect(report.combined).toEqual(
      bucket({
        total: 10,
        alreadyLocal: 2,
        notLocal: 2,
        missing: 1,
        nonPublic: 2,
        spam: 1,
        takedown: 1,
        noPodcastIndexId: 1,
      })
    );
    expect(report.beyondSubscriptions).toEqual(bucket({ total: 2, notLocal: 1, nonPublic: 1 }));
  });

  it('lists only seedable shows that have no local channel and an authority URL', () => {
    const plan = selectCatalogSeedCreates(
      sources({
        subscriptions: ['local', 'seed', 'noUrl', 'hidden'],
      }),
      [
        podcast('local', { authorityUrl: 'https://feeds.example/local' }),
        podcast('seed', { podcastIndexId: '7', authorityUrl: 'https://feeds.example/seed' }),
        podcast('noUrl', { podcastIndexId: '8' }),
        podcast('hidden', { isPublic: false, authorityUrl: 'https://feeds.example/hidden' }),
      ],
      catalog({ channelIdTexts: new Set(['local']) })
    );

    expect(plan.creates).toEqual([
      { id: 'seed', podcastIndexId: 7, authorityUrl: 'https://feeds.example/seed' },
    ]);
    expect(plan.skippedNoAuthorityUrl).toBe(1);
  });
});
