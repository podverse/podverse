import { describe, expect, it } from 'vitest';

import { convertParsedRSSFeedToCompat } from '@podverse/parser-mapping';

import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import {
  extractPreviewFromParsePayload,
  mapParsedFeedToPreview,
  mergeLocalAndRemoteAddByRssFeeds,
} from './domain';

const localFeed = (
  overrides: Partial<MobileAddByRSSFeedRecord> = {}
): MobileAddByRSSFeedRecord => ({
  enclosureUrl: null,
  feedUrl: 'https://e2e-seed-addbyrss.example/podcast.xml',
  id: 1,
  idText: 'rss-1',
  imageUrl: null,
  latestItemPubDateMs: null,
  playbackPosition: null,
  resourceType: 'podcasts',
  title: 'E2E Add-by-RSS Channel',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('mergeLocalAndRemoteAddByRssFeeds', () => {
  it('keeps a parsed local title when the followed list still has the feed URL', () => {
    const feedUrl = 'https://e2e-seed-addbyrss.example/podcast.xml';
    const merged = mergeLocalAndRemoteAddByRssFeeds(
      [localFeed({ feedUrl })],
      [{ feed_url: feedUrl, image_url: null, title: feedUrl }]
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.title).toBe('E2E Add-by-RSS Channel');
  });

  it('uses the followed title when this device has not parsed the feed yet', () => {
    const merged = mergeLocalAndRemoteAddByRssFeeds(
      [],
      [
        {
          feed_url: 'https://example.com/feed.xml',
          image_url: null,
          title: 'Remote Title',
        },
      ]
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.title).toBe('Remote Title');
  });
});

const rawParsePayload = {
  items: [
    {
      enclosure: { length: 100, type: 'audio/mpeg', url: 'https://example.com/episode.mp3' },
      guid: 'episode-1',
      title: 'Episode One',
    },
  ],
  title: 'Show Name',
};

describe('add-by-RSS parse previews', () => {
  it('titles the feed record with the channel title, not its first episode', () => {
    const mappedFeed = convertParsedRSSFeedToCompat({
      explicit: false,
      items: [
        {
          duration: 60,
          enclosure: { length: 100, type: 'audio/mpeg', url: 'https://example.com/episode.mp3' },
          explicit: false,
          guid: 'episode-1',
          pubDate: new Date('2026-01-01T00:00:00.000Z'),
          title: 'Episode One',
        },
      ],
      link: 'https://example.com/feed.xml',
      title: 'Show Name',
    });

    expect(mapParsedFeedToPreview(mappedFeed).title).toBe('Show Name');
  });

  it('prefers the channel title in the raw payload fallback too', () => {
    expect(extractPreviewFromParsePayload(rawParsePayload).title).toBe('Show Name');
  });

  it('falls back to the first episode title when the feed has no channel title', () => {
    expect(extractPreviewFromParsePayload({ ...rawParsePayload, title: '  ' }).title).toBe(
      'Episode One'
    );
  });
});
