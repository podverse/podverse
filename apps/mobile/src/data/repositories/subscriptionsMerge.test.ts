import { describe, expect, it } from 'vitest';

import type { DTOChannel } from '@podverse/helpers';
import { matchesTitleFilter } from '@podverse/helpers';

import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import type { SubscribedChannel } from './subscriptionsMerge';
import {
  applySubscriptionFilter,
  mapAddByRssToSubscribed,
  mapDirectoryChannelToSubscribed,
  mergeSubscriptions,
  sortSubscriptions,
} from './subscriptionsMerge';

/** Narrow a mapper result to non-null without a type assertion (mappers drop untitled entries). */
const requireMapped = (value: SubscribedChannel | null): SubscribedChannel => {
  if (value === null) {
    throw new Error('expected a mapped SubscribedChannel, received null');
  }
  return value;
};

const channel = (partial: Partial<DTOChannel>): DTOChannel => ({
  id: 1,
  id_text: 'chan1',
  slug: null,
  feed_id: 1,
  podcast_guid: null,
  title: 'Channel One',
  sortable_title: null,
  medium_id: 1,
  has_podcast_index_value: false,
  has_value_time_splits: false,
  ...partial,
});

const rssFeed = (partial: Partial<MobileAddByRSSFeedRecord>): MobileAddByRSSFeedRecord => ({
  id: 1,
  idText: 'rss1',
  resourceType: 'podcasts',
  feedUrl: 'https://example.com/feed.xml',
  title: 'RSS Feed',
  imageUrl: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
  enclosureUrl: null,
  latestItemPubDateMs: null,
  playbackPosition: null,
  ...partial,
});

/** A directory entry with the recency the repository attaches after reading the item store. */
const directoryEntryPublishedAt = (
  partial: Partial<DTOChannel>,
  latestItemPubDateMs: number | null
): SubscribedChannel => ({
  ...requireMapped(mapDirectoryChannelToSubscribed(channel(partial))),
  latestItemPubDateMs,
});

const directoryEntry = (partial: Partial<DTOChannel>): SubscribedChannel =>
  requireMapped(mapDirectoryChannelToSubscribed(channel(partial)));

const rssEntry = (partial: Partial<MobileAddByRSSFeedRecord>): SubscribedChannel =>
  requireMapped(mapAddByRssToSubscribed(rssFeed(partial)));

describe('mapDirectoryChannelToSubscribed', () => {
  it('maps id_text, title, first image, and directory source', () => {
    const result = mapDirectoryChannelToSubscribed(
      channel({
        id_text: 'abc',
        title: 'My Podcast',
        channel_images: [
          { id: 1, channel_id: 1, url: '  ', image_width_size: null, is_resized: false },
          {
            id: 2,
            channel_id: 1,
            url: 'https://img/p.jpg',
            image_width_size: null,
            is_resized: false,
          },
        ],
      })
    );

    expect(result).toEqual({
      idText: 'abc',
      title: 'My Podcast',
      imageUrl: 'https://img/p.jpg',
      source: 'directory',
      medium: 'podcasts',
      latestItemPubDateMs: null,
    });
  });

  it('drops channels without a usable title', () => {
    expect(mapDirectoryChannelToSubscribed(channel({ title: null }))).toBeNull();
    expect(mapDirectoryChannelToSubscribed(channel({ title: '   ' }))).toBeNull();
  });
});

describe('mapAddByRssToSubscribed', () => {
  it('falls back to the feed URL when the title is missing', () => {
    const result = mapAddByRssToSubscribed(rssFeed({ feedUrl: 'https://x/f.xml', title: null }));
    expect(result).toEqual({
      idText: 'https://x/f.xml',
      title: 'https://x/f.xml',
      imageUrl: null,
      source: 'addByRss',
      medium: 'podcasts',
      latestItemPubDateMs: null,
    });
  });

  it('carries the stored publish date so recency ordering never re-parses the bundle', () => {
    expect(rssEntry({ latestItemPubDateMs: 1_700_000_000_000 }).latestItemPubDateMs).toBe(
      1_700_000_000_000
    );
  });

  it('marks music resource types as music medium', () => {
    expect(rssEntry({ resourceType: 'albums' }).medium).toBe('music');
    expect(rssEntry({ resourceType: 'artists' }).medium).toBe('music');
    expect(rssEntry({ resourceType: 'episodes' }).medium).toBe('podcasts');
  });
});

describe('mergeSubscriptions', () => {
  it('unions both sources and dedupes by idText (first wins)', () => {
    const directory = [directoryEntry({ id_text: 'dup', title: 'Directory' })];
    const addByRss = [
      rssEntry({ feedUrl: 'dup', title: 'RSS Dup' }),
      rssEntry({ feedUrl: 'unique', title: 'RSS Unique' }),
    ];

    const merged = mergeSubscriptions(directory, addByRss);
    expect(merged).toHaveLength(2);
    expect(merged.find((entry) => entry.idText === 'dup')?.source).toBe('directory');
    expect(merged.map((entry) => entry.idText)).toContain('unique');
  });
});

describe('applySubscriptionFilter', () => {
  const directory = directoryEntry({ id_text: 'd', title: 'Dir' });
  const addByRss = rssEntry({ feedUrl: 'r', title: 'Rss' });
  const list = [directory, addByRss];

  it('returns everything for "all"', () => {
    expect(applySubscriptionFilter(list, 'all')).toHaveLength(2);
  });

  it('returns only add-by-RSS for "addByRss"', () => {
    expect(applySubscriptionFilter(list, 'addByRss')).toEqual([addByRss]);
  });

  it('returns only directory for "directory"', () => {
    expect(applySubscriptionFilter(list, 'directory')).toEqual([directory]);
  });
});

describe('sortSubscriptions', () => {
  it('sorts alphabetically, stripping a leading article and ignoring case', () => {
    const list = [
      directoryEntry({ id_text: '1', title: 'The Zebra Show' }),
      rssEntry({ feedUrl: '2', title: 'apple cast' }),
      directoryEntry({ id_text: '3', title: 'Banana Time' }),
    ];

    expect(sortSubscriptions(list).map((entry) => entry.title)).toEqual([
      'apple cast',
      'Banana Time',
      'The Zebra Show',
    ]);
  });

  it('sorts by latest publish date descending, mixing both sources', () => {
    const list = [
      directoryEntryPublishedAt({ id_text: '1', title: 'Older Directory' }, 1_000),
      rssEntry({ feedUrl: '2', title: 'Newest RSS', latestItemPubDateMs: 3_000 }),
      directoryEntryPublishedAt({ id_text: '3', title: 'Middle Directory' }, 2_000),
    ];

    expect(sortSubscriptions(list, 'recent').map((entry) => entry.title)).toEqual([
      'Newest RSS',
      'Middle Directory',
      'Older Directory',
    ]);
  });

  it('puts subscriptions with no known date after those that have one', () => {
    const list = [
      directoryEntryPublishedAt({ id_text: '1', title: 'Never Synced' }, null),
      directoryEntryPublishedAt({ id_text: '2', title: 'Has Episodes' }, 1_000),
    ];

    expect(sortSubscriptions(list, 'recent').map((entry) => entry.title)).toEqual([
      'Has Episodes',
      'Never Synced',
    ]);
  });

  it('breaks ties by title so the order is stable across re-sorts', () => {
    const list = [
      directoryEntryPublishedAt({ id_text: '1', title: 'Zebra' }, 1_000),
      directoryEntryPublishedAt({ id_text: '2', title: 'Apple' }, 1_000),
      directoryEntryPublishedAt({ id_text: '3', title: 'The Banana' }, null),
      directoryEntryPublishedAt({ id_text: '4', title: 'Anchovy' }, null),
    ];

    expect(sortSubscriptions(list, 'recent').map((entry) => entry.title)).toEqual([
      'Apple',
      'Zebra',
      'Anchovy',
      'The Banana',
    ]);
  });

  it('does not mutate the list it was given', () => {
    const list = [
      directoryEntryPublishedAt({ id_text: '1', title: 'Zebra' }, 1_000),
      directoryEntryPublishedAt({ id_text: '2', title: 'Apple' }, 2_000),
    ];

    sortSubscriptions(list, 'recent');
    expect(list.map((entry) => entry.title)).toEqual(['Zebra', 'Apple']);
  });
});

describe('filtering a mapped subscription by title', () => {
  it('finds an add-by-RSS entry that fell back to its feed URL for a title', () => {
    const entry = rssEntry({ feedUrl: 'https://example.com/great-show.xml', title: null });
    expect(matchesTitleFilter(entry.title, 'great-show')).toBe(true);
  });
});

describe('merge + filter + sort pipeline', () => {
  it('produces a deduped, alphabetical mixed list and honors offline single-source cases', () => {
    // A titleless directory channel is dropped by the mapper, so it never reaches the merge.
    expect(mapDirectoryChannelToSubscribed(channel({ id_text: 'd2', title: null }))).toBeNull();

    const directory = [directoryEntry({ id_text: 'd1', title: 'Untitled?' })];
    const addByRss = [rssEntry({ feedUrl: 'r1', title: 'Alpha' })];

    const merged = sortSubscriptions(mergeSubscriptions(directory, addByRss), 'alphabetical');
    expect(merged.map((entry) => entry.title)).toEqual(['Alpha', 'Untitled?']);

    // Offline before first directory sync (directory cache empty) → add-by-RSS still lists.
    expect(mergeSubscriptions([], addByRss)).toHaveLength(1);
    // Add-by-RSS empty (only directory follows) → directory still lists.
    expect(mergeSubscriptions(directory, [])).toHaveLength(1);
  });
});
