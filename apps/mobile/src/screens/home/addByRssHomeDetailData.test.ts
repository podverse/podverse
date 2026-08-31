import { describe, expect, it } from 'vitest';

import { convertParsedRSSFeedToCompat } from '@podverse/parser-mapping';

import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import {
  buildAddByRssHomeDetailData,
  sortAddByRssHomeEpisodes,
} from './addByRssHomeDetailData';

const feed: MobileAddByRSSFeedRecord = {
  enclosureUrl: 'https://example.com/first.mp3',
  feedUrl: 'https://example.com/feed.xml',
  id: 1,
  idText: 'rss-1',
  imageUrl: 'https://example.com/feed.png',
  latestItemPubDateMs: null,
  playbackPosition: null,
  resourceType: 'podcasts',
  title: 'Example Feed',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mappedFeed = convertParsedRSSFeedToCompat({
  explicit: false,
  items: [
    {
      duration: 60,
      enclosure: { length: 100, type: 'audio/mpeg', url: 'https://example.com/old.mp3' },
      explicit: false,
      guid: 'old',
      pubDate: new Date('2026-01-01T00:00:00.000Z'),
      title: 'Zebra',
    },
    {
      duration: 60,
      enclosure: { length: 100, type: 'audio/mpeg', url: 'https://example.com/new.mp3' },
      explicit: false,
      guid: 'new',
      pubDate: new Date('2026-02-01T00:00:00.000Z'),
      title: 'Apple',
    },
  ],
  link: 'https://example.com/feed.xml',
  title: 'Example Feed',
});

describe('add-by-RSS Home detail data', () => {
  it('maps stored feed items into stable Home rows', () => {
    const detail = buildAddByRssHomeDetailData(feed, mappedFeed);

    expect(detail.episodeRows.map((row) => row.title)).toEqual(['Zebra', 'Apple']);
    expect(detail.episodeRows[0]?.id).toBe('rss-1-old');
    expect(detail.episodeRows[0]?.subtitle).toBe('Example Feed');
  });

  it('sorts episodes by title or newest publication date', () => {
    const rows = buildAddByRssHomeDetailData(feed, mappedFeed).episodeRows;

    expect(sortAddByRssHomeEpisodes(rows, 'alphabetical').map((row) => row.title)).toEqual([
      'Apple',
      'Zebra',
    ]);
    expect(sortAddByRssHomeEpisodes(rows, 'recent').map((row) => row.title)).toEqual([
      'Apple',
      'Zebra',
    ]);
  });
});
