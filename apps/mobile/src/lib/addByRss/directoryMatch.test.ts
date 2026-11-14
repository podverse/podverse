import { describe, expect, it } from 'vitest';

import {
  ADD_BY_RSS_DIRECTORY_MATCH_MAX_FEEDS,
  ADD_BY_RSS_DIRECTORY_MATCH_MAX_ITEMS,
} from '@podverse/helpers/dto';
import { convertParsedRSSFeedToCompat } from '@podverse/parser-mapping';

import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import {
  buildAddByRssMatchRefs,
  localItemRefsForFeed,
  shouldRunDirectoryMatch,
} from './directoryMatch';
import { addByRssDownloadItemIdText } from './downloadIdText';

const feed = (
  feedUrl: string,
  itemCount: number,
  extras: { channelIdText?: string; guidPrefix?: string; requiresCredentials?: boolean } = {}
) => ({
  channelIdText: extras.channelIdText ?? null,
  feedUrl,
  items: Array.from({ length: itemCount }, (_, index) => ({
    enclosureUrl: `https://cdn.example.com/${index}.mp3`,
    guid: `${extras.guidPrefix ?? 'ep'}-${index}`,
  })),
  podcastGuid: null,
  requiresCredentials: extras.requiresCredentials ?? false,
});

describe('shouldRunDirectoryMatch', () => {
  const hour = 60 * 60 * 1000;

  it('runs when forced, when it has never run, and again after an hour', () => {
    expect(shouldRunDirectoryMatch(Date.now(), Date.now(), true)).toBe(true);
    expect(shouldRunDirectoryMatch(null, 1_000, false)).toBe(true);
    expect(shouldRunDirectoryMatch(1_000, 1_000 + hour - 1, false)).toBe(false);
    expect(shouldRunDirectoryMatch(1_000, 1_000 + hour, false)).toBe(true);
  });
});

describe('buildAddByRssMatchRefs', () => {
  it('chunks at the feed cap and the item cap without splitting a feed', () => {
    const manyFeeds = Array.from({ length: ADD_BY_RSS_DIRECTORY_MATCH_MAX_FEEDS + 1 }, (_, index) =>
      feed(`https://example.com/${index}.xml`, 0)
    );
    const feedChunks = buildAddByRssMatchRefs(manyFeeds);
    expect(feedChunks.map((chunk) => chunk.length)).toEqual([
      ADD_BY_RSS_DIRECTORY_MATCH_MAX_FEEDS,
      1,
    ]);

    const itemChunks = buildAddByRssMatchRefs([
      feed('https://example.com/a.xml', 300),
      feed('https://example.com/b.xml', 300),
    ]);
    expect(itemChunks).toHaveLength(2);
    expect(itemChunks[0]?.[0]?.items).toHaveLength(300);

    const packed = buildAddByRssMatchRefs([
      feed('https://example.com/a.xml', 400),
      feed('https://example.com/b.xml', 100),
    ]);
    expect(packed).toHaveLength(1);
    expect(packed[0]?.map((entry) => entry.items.length)).toEqual([400, 100]);

    const oversized = buildAddByRssMatchRefs([
      feed('https://example.com/big.xml', ADD_BY_RSS_DIRECTORY_MATCH_MAX_ITEMS + 25),
    ]);
    expect(oversized).toHaveLength(1);
    expect(oversized[0]?.[0]?.items).toHaveLength(ADD_BY_RSS_DIRECTORY_MATCH_MAX_ITEMS);
  });

  it('drops credentialed feeds, userinfo, and device-local guids', () => {
    const chunks = buildAddByRssMatchRefs([
      feed('https://example.com/open.xml', 1, {
        channelIdText: 'device-1',
        guidPrefix: 'device-1',
      }),
      feed('https://example.com/secret.xml', 1, { requiresCredentials: true }),
      feed('http://user:pass@example.com/private.xml', 1),
    ]);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(1);
    expect(chunks[0]?.[0]?.feed_url).toBe('https://example.com/open.xml');
    expect(chunks[0]?.[0]?.items[0]).toEqual({
      enclosure_url: 'https://cdn.example.com/0.mp3',
      guid: null,
    });
  });
});

describe('localItemRefsForFeed', () => {
  const feedUrl = 'https://example.com/show.xml';
  const record: MobileAddByRSSFeedRecord = {
    enclosureUrl: null,
    feedUrl,
    id: 3,
    idText: 'device-show',
    imageUrl: null,
    latestItemPubDateMs: null,
    playbackPosition: null,
    resourceType: 'podcasts',
    title: 'Show',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const mappedFeed = convertParsedRSSFeedToCompat({
    explicit: false,
    items: [
      {
        duration: 60,
        enclosure: { length: 10, type: 'audio/mpeg', url: 'https://cdn.example.com/kept.mp3' },
        explicit: false,
        guid: 'kept',
        title: 'Kept',
      },
      {
        duration: 60,
        enclosure: { length: 10, type: 'audio/mpeg', url: 'https://cdn.example.com/other.mp3' },
        explicit: false,
        guid: 'other',
        title: 'Other',
      },
    ],
    link: feedUrl,
    title: 'Show',
  });

  it('keeps an episode the device stores and reads its guid and enclosure', () => {
    const downloadId = addByRssDownloadItemIdText(feedUrl, { guid: 'kept' }, 0);
    const refs = localItemRefsForFeed(record, mappedFeed, new Set([downloadId]));

    expect(refs).toHaveLength(1);
    expect(refs[0]?.guid).toBe('kept');
    expect(refs[0]?.enclosureUrl).toBe('https://cdn.example.com/kept.mp3');
    expect(refs[0]?.downloadIdText).toBe(downloadId);
    expect(refs[0]?.hashId.length).toBeGreaterThan(0);
  });
});
