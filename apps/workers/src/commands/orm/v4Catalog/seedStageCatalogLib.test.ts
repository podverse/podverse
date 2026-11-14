import { describe, expect, it } from 'vitest';

import type { LocalCatalog, V4PodcastKey } from '../v4Library/copyAccountLibraryLib.js';
import type { StageCatalogShow, StageCatalogSource } from './seedStageCatalogLib.js';
import {
  classifyStageCatalog,
  countSettledParses,
  refusalForDuplicateCreates,
  stageChannelTakesFirstParse,
  stageShowNeedsFirstParse,
} from './seedStageCatalogLib.js';

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

function show(
  id: string,
  sources: readonly StageCatalogSource[],
  overrides: Partial<V4PodcastKey> | null
): StageCatalogShow {
  return {
    id,
    sources,
    podcast: overrides === null ? null : podcast(id, overrides),
  };
}

describe('classifyStageCatalog', () => {
  it('counts a subscribed show once when it was also viewed and on a clip', () => {
    const report = classifyStageCatalog(
      [
        show('showsub', ['subscribed', 'viewed', 'library'], {
          podcastIndexId: '11',
          authorityUrl: 'https://feeds.example/sub',
        }),
      ],
      catalog()
    );

    expect(report.subscribed).toBe(1);
    expect(report.viewedNotSubscribed).toBe(0);
    expect(report.libraryOnly).toBe(0);
    expect(report.creates).toEqual([
      { id: 'showsub', podcastIndexId: 11, authorityUrl: 'https://feeds.example/sub' },
    ]);
  });

  it('creates a viewed show and a library show, and skips a hidden viewed show', () => {
    const report = classifyStageCatalog(
      [
        show('viewed1', ['viewed'], {
          podcastIndexId: '21',
          authorityUrl: 'https://feeds.example/viewed',
        }),
        show('librar1', ['library'], {
          podcastIndexId: '22',
          authorityUrl: 'https://feeds.example/library',
        }),
        show('hidden1', ['viewed'], {
          isPublic: false,
          authorityUrl: 'https://feeds.example/hidden',
        }),
      ],
      catalog()
    );

    expect(report.subscribed).toBe(0);
    expect(report.viewedNotSubscribed).toBe(2);
    expect(report.libraryOnly).toBe(1);
    expect(report.nonPublic).toBe(1);
    expect(report.creates).toEqual([
      { id: 'librar1', podcastIndexId: 22, authorityUrl: 'https://feeds.example/library' },
      { id: 'viewed1', podcastIndexId: 21, authorityUrl: 'https://feeds.example/viewed' },
    ]);
  });

  it('leaves hidden, flagged, missing, and already local shows out of creates', () => {
    const report = classifyStageCatalog(
      [
        show('hidden2', ['subscribed'], { isPublic: false }),
        show('spamsho', ['subscribed'], { flagStatus: 'spam' }),
        show('takedown', ['subscribed'], { flagStatus: 'takedown' }),
        show('missing', ['subscribed'], null),
        show('noindex', ['subscribed'], { podcastIndexId: 'nope' }),
        show('local01', ['subscribed'], {
          podcastIndexId: '31',
          authorityUrl: 'https://feeds.example/local',
        }),
        show('absorb1', ['subscribed'], {
          podcastIndexId: '42',
          authorityUrl: 'https://feeds.example/absorb',
        }),
      ],
      catalog({
        channelIdTexts: new Set(['local01']),
        absorbSurvivorByPodcastIndexId: new Map([[42, 'surviv1']]),
      })
    );

    expect(report.creates).toEqual([]);
    expect(report.nonPublic).toBe(1);
    expect(report.spam).toBe(1);
    expect(report.takedown).toBe(1);
    expect(report.missing).toBe(1);
    expect(report.noPodcastIndexId).toBe(1);
    expect(report.alreadyLocal).toBe(2);
  });

  it('counts a missing authority URL and an id that is too short', () => {
    const report = classifyStageCatalog(
      [
        show('nourl01', ['subscribed'], { podcastIndexId: '51' }),
        show('abcdef', ['library'], {
          podcastIndexId: '52',
          authorityUrl: 'https://feeds.example/short',
        }),
      ],
      catalog()
    );

    expect(report.skippedNoAuthorityUrl).toBe(1);
    expect(report.skippedInvalidId).toBe(1);
    expect(report.creates).toEqual([]);
  });
});

describe('refusalForDuplicateCreates', () => {
  it('refuses the later show when two creates share a Podcast Index id', () => {
    const refusal = refusalForDuplicateCreates([
      { id: 'laterone', podcastIndexId: 5, authorityUrl: 'https://feeds.example/b' },
      { id: 'earlier1', podcastIndexId: 5, authorityUrl: 'https://feeds.example/a' },
    ]);

    expect(refusal).toBe(
      'Refusing to seed https://podverse.fm/podcast/laterone because that show is already ' +
        'https://podverse.fm/podcast/earlier1. Nothing was written.'
    );
  });

  it('refuses the later show when two creates share an authority URL', () => {
    const refusal = refusalForDuplicateCreates([
      { id: 'nexturl1', podcastIndexId: 2, authorityUrl: 'https://feeds.example/same' },
      { id: 'firsturl', podcastIndexId: 1, authorityUrl: 'https://feeds.example/same' },
    ]);

    expect(refusal).toBe(
      'Refusing to seed https://podverse.fm/podcast/nexturl1 because Podcast Index id ' +
        '1 already uses that authority URL. Nothing was written.'
    );
    expect(refusal).not.toContain('https://feeds.example/same');
  });
});

describe('stageShowNeedsFirstParse', () => {
  const idle = {
    isParsing: null,
    lastFinishedParseTime: null,
    lastFailedParseTime: null,
  };

  it('is true only when parsing, finished, and failed are all unset', () => {
    expect(stageShowNeedsFirstParse(idle)).toBe(true);
    expect(stageShowNeedsFirstParse({ ...idle, isParsing: new Date(0) })).toBe(false);
    expect(stageShowNeedsFirstParse({ ...idle, lastFinishedParseTime: new Date(0) })).toBe(false);
    expect(stageShowNeedsFirstParse({ ...idle, lastFailedParseTime: new Date(0) })).toBe(false);
  });
});

describe('stageChannelTakesFirstParse', () => {
  it('is true only when the channel id is the v4 podcast id', () => {
    expect(stageChannelTakesFirstParse('podid01', 'podid01')).toBe(true);
    expect(stageChannelTakesFirstParse('surviv1', 'podid01')).toBe(false);
  });
});

describe('countSettledParses', () => {
  it('counts a finished settle, a failed settle, and a feed that is still waiting', () => {
    expect(
      countSettledParses([
        { settled: true, lastFinishedParseTime: new Date(0) },
        { settled: true, lastFinishedParseTime: null },
        { settled: false, lastFinishedParseTime: null },
      ])
    ).toEqual({ settled: 2, failedParse: 1, waiting: 1 });
  });
});
