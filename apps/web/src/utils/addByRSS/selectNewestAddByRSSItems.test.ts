import { describe, expect, it } from 'vitest';

import type { AddByRSSMappedFeed } from '@podverse/parser-mapping';

import { selectNewestAddByRSSItemsFromFeeds } from './itemIndex';
import type { AddByRSSFeedRecord } from './types';

const episode = (guid: string, pubDate: string) => ({
  item: { guid, pub_date: pubDate },
  enclosures: [] as const,
});

const feed = (idText: string, items: ReturnType<typeof episode>[]): AddByRSSFeedRecord => ({
  id: 1,
  idText,
  resourceType: 'podcasts',
  feedUrl: `https://example.com/${idText}.xml`,
  title: idText,
  imageUrl: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
  // The selector reads item guid, publish date, and enclosures.
  mappedFeed: { items, liveItems: [] } as unknown as AddByRSSMappedFeed,
});

describe('selectNewestAddByRSSItemsFromFeeds', () => {
  it('keeps a newer item from a later feed when the cap is one', () => {
    const older = feed('feed-a', [episode('old-ep', '2026-01-01T00:00:00.000Z')]);
    const newer = feed('feed-b', [episode('new-ep', '2026-06-01T00:00:00.000Z')]);

    const selected = selectNewestAddByRSSItemsFromFeeds({
      feeds: [older, newer],
      limit: 1,
    });

    expect(selected.map((item) => item.itemGuid)).toEqual(['new-ep']);
  });

  it('reuses an id the items index already stored', () => {
    const parsed = feed('feed-b', [episode('new-ep', '2026-06-01T00:00:00.000Z')]);

    const selected = selectNewestAddByRSSItemsFromFeeds({
      feeds: [parsed],
      limit: 1,
      existingIdTextByCompositeId: new Map([['feed-b-new-ep', 'stored-id']]),
    });

    expect(selected[0]?.idText).toBe('stored-id');
  });
});
