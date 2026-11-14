import { describe, expect, it } from 'vitest';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

import type { LegacyPodcastMapRow, V4PodcastMapSource } from './writeLegacyPodcastMapLib.js';
import { planLegacyPodcastMapRow } from './writeLegacyPodcastMapLib.js';

const FEED_URL = 'https://example.com/feed.xml';

function source(overrides: Partial<V4PodcastMapSource> = {}): V4PodcastMapSource {
  return {
    id: 'podcast1',
    podcastIndexId: '15',
    authorityUrl: FEED_URL,
    isPublic: true,
    flagStatus: 'none',
    ...overrides,
  };
}

function unresolved(overrides: Partial<LegacyPodcastMapRow> = {}): LegacyPodcastMapRow {
  return {
    legacyId: 'podcast1',
    status: 'unresolved',
    resolveKey: '15',
    v4FeedUrl: FEED_URL,
    ...overrides,
  };
}

describe('planLegacyPodcastMapRow', () => {
  it('drops spam and takedown without a resolve key or feed URL', () => {
    const dropped: LegacyPodcastMapRow = {
      legacyId: 'podcast1',
      status: 'dropped',
      resolveKey: null,
      v4FeedUrl: null,
    };
    expect(planLegacyPodcastMapRow(source({ flagStatus: 'spam' }))).toEqual(dropped);
    expect(planLegacyPodcastMapRow(source({ flagStatus: ' spam ' }))).toEqual(dropped);
    expect(
      planLegacyPodcastMapRow(
        source({ flagStatus: 'spam', authorityUrl: null, podcastIndexId: null, isPublic: false })
      )
    ).toEqual(dropped);
    expect(planLegacyPodcastMapRow(source({ flagStatus: 'takedown' }))).toEqual(dropped);
  });

  it('keeps other, none, and always-allow for a public podcast with an index id', () => {
    const kept = unresolved({
      resolveKey: '15',
      v4FeedUrl: 'https://example.com/my feed.xml',
    });
    for (const flagStatus of ['other', 'none', 'always-allow']) {
      expect(
        planLegacyPodcastMapRow(
          source({
            flagStatus,
            podcastIndexId: ' 15 ',
            authorityUrl: '  https://example.com/my feed.xml  ',
          })
        )
      ).toEqual(kept);
    }
  });

  it('stores a null resolve key for a non-public podcast that has a Podcast Index id', () => {
    expect(planLegacyPodcastMapRow(source({ isPublic: false, podcastIndexId: '15' }))).toEqual(
      unresolved({ resolveKey: null })
    );
  });

  it('stores a null resolve key for a public podcast without a positive Podcast Index id', () => {
    for (const podcastIndexId of [null, '', '   ', '0', '01', '1.2', '-3', 'abc']) {
      expect(planLegacyPodcastMapRow(source({ podcastIndexId }))).toEqual(
        unresolved({ resolveKey: null })
      );
    }
  });

  it('returns no row for a blank authority URL', () => {
    for (const authorityUrl of [null, '', '   ']) {
      expect(planLegacyPodcastMapRow(source({ flagStatus: 'other', authorityUrl }))).toBeNull();
    }
  });

  it('returns no row for a non-http authority URL', () => {
    for (const authorityUrl of ['ftp://example.com/feed.xml', 'not a url', 'http:/example.com']) {
      expect(planLegacyPodcastMapRow(source({ authorityUrl }))).toBeNull();
    }
  });

  it('stores a feed URL at the column limit and skips a longer one', () => {
    const max = DATABASE_CONSTANTS.varchar_url;
    const prefix = 'https://example.com/';
    const exact = prefix + 'a'.repeat(max - prefix.length);
    expect(exact.length).toBe(max);
    expect(planLegacyPodcastMapRow(source({ authorityUrl: exact, podcastIndexId: null }))).toEqual(
      unresolved({ resolveKey: null, v4FeedUrl: exact })
    );
    expect(planLegacyPodcastMapRow(source({ authorityUrl: `${exact}a` }))).toBeNull();
  });

  it('lowercases only the scheme so the feed URL column accepts it', () => {
    expect(
      planLegacyPodcastMapRow(source({ authorityUrl: 'HTTPS://example.com/feed.xml' }))
    ).toEqual(unresolved({ v4FeedUrl: FEED_URL }));
    expect(
      planLegacyPodcastMapRow(source({ authorityUrl: 'HTTP://Example.com/Feed.xml' }))
    ).toEqual(unresolved({ v4FeedUrl: 'http://Example.com/Feed.xml' }));
  });
});
