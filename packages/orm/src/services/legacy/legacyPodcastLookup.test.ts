import { describe, expect, it } from 'vitest';

import type { DTOLegacyPodcastLookupChannel } from '@podverse/helpers';

import type {
  LegacyPodcastLookupChannelMaps,
  LegacyPodcastLookupRow,
} from './legacyPodcastLookup.js';
import { orderLegacyPodcastLookupAnswers } from './legacyPodcastLookup.js';

const SHOW: DTOLegacyPodcastLookupChannel = {
  id_text: 'show0001',
  title: 'Mapped Show',
  medium_id: 1,
  image_url: 'https://cdn.example.com/mapped.jpg',
};

const INDEX_SHOW: DTOLegacyPodcastLookupChannel = {
  id_text: 'index001',
  title: 'Index Show',
  medium_id: 1,
  image_url: null,
};

const URL_SHOW: DTOLegacyPodcastLookupChannel = {
  id_text: 'urlshow1',
  title: 'URL Show',
  medium_id: 1,
  image_url: 'https://cdn.example.com/url.jpg',
};

function row(
  overrides: Partial<LegacyPodcastLookupRow> & { legacyId: string }
): LegacyPodcastLookupRow {
  return {
    status: 'unresolved',
    v5IdText: null,
    resolveKey: null,
    v4FeedUrl: null,
    ...overrides,
  };
}

function maps(
  overrides: Partial<LegacyPodcastLookupChannelMaps> = {}
): LegacyPodcastLookupChannelMaps {
  return {
    byIdText: new Map(),
    byPodcastIndexId: new Map(),
    byFeedUrl: new Map(),
    ...overrides,
  };
}

describe('orderLegacyPodcastLookupAnswers', () => {
  const rows = new Map<string, LegacyPodcastLookupRow>([
    [
      'blocked',
      row({
        legacyId: 'blocked',
        status: 'dropped',
        v5IdText: 'show0001',
        resolveKey: '42',
        v4FeedUrl: 'https://example.com/blocked.xml',
      }),
    ],
    [
      'mapped',
      row({
        legacyId: 'mapped',
        status: 'mapped',
        v5IdText: 'show0001',
        resolveKey: '42',
        v4FeedUrl: 'https://example.com/mapped.xml',
      }),
    ],
    [
      'index',
      row({
        legacyId: 'index',
        resolveKey: '42',
        v4FeedUrl: 'https://example.com/index.xml',
      }),
    ],
    [
      'url-channel',
      row({
        legacyId: 'url-channel',
        v4FeedUrl: 'https://example.com/url.xml',
      }),
    ],
    [
      'url-only',
      row({
        legacyId: 'url-only',
        v4FeedUrl: 'https://example.com/missing.xml',
      }),
    ],
    ['empty', row({ legacyId: 'empty', v5IdText: null, resolveKey: null, v4FeedUrl: null })],
  ]);

  const channels = maps({
    byIdText: new Map([['show0001', SHOW]]),
    byPodcastIndexId: new Map([['42', INDEX_SHOW]]),
    byFeedUrl: new Map([['https://example.com/url.xml', URL_SHOW]]),
  });

  it('keeps input order and answers a duplicate once for each copy', () => {
    const answers = orderLegacyPodcastLookupAnswers(
      ['blocked', 'mapped', 'blocked', 'missing'],
      rows,
      channels
    );

    expect(answers.map((answer) => answer.podcast_id)).toEqual([
      'blocked',
      'mapped',
      'blocked',
      'missing',
    ]);
    expect(answers.map((answer) => answer.kind)).toEqual([
      'blocked',
      'channel',
      'blocked',
      'not_here',
    ]);
  });

  it('uses the mapped channel before the Podcast Index id and the feed URL', () => {
    const [answer] = orderLegacyPodcastLookupAnswers(['mapped'], rows, channels);

    expect(answer).toEqual({ podcast_id: 'mapped', kind: 'channel', channel: SHOW });
  });

  it('uses the Podcast Index channel when the mapped id has no eligible channel', () => {
    const [answer] = orderLegacyPodcastLookupAnswers(['index'], rows, channels);

    expect(answer).toEqual({ podcast_id: 'index', kind: 'channel', channel: INDEX_SHOW });
  });

  it('uses a feed URL directory channel, then the URL itself, then not_here', () => {
    const answers = orderLegacyPodcastLookupAnswers(
      ['url-channel', 'url-only', 'empty'],
      rows,
      channels
    );

    expect(answers).toEqual([
      { podcast_id: 'url-channel', kind: 'channel', channel: URL_SHOW },
      { podcast_id: 'url-only', kind: 'feed_url', feed_url: 'https://example.com/missing.xml' },
      { podcast_id: 'empty', kind: 'not_here' },
    ]);
  });

  it('treats a dropped row as blocked even when every lookup has a channel', () => {
    const [answer] = orderLegacyPodcastLookupAnswers(['blocked'], rows, channels);

    expect(answer).toEqual({ podcast_id: 'blocked', kind: 'blocked' });
  });
});
