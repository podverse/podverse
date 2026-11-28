import { describe, expect, it } from 'vitest';

import { getAddByRSSHashId } from '@podverse/helpers';
import { convertParsedRSSFeedToCompat } from '@podverse/parser-mapping';

import { safeJsonParse } from '../../data/db/serialization';
import { toAddByRssItemPlaybackResourceData } from '../../lib/addByRss/domain';
import { addByRssDownloadItemIdText } from '../../lib/addByRss/downloadIdText';
import {
  buildAddByRssLocalItemBundle,
  mergeAddByRssLocalEpisodes,
} from '../../lib/addByRss/localEpisode';
import { addByRssPlaybackMediaId } from '../../lib/addByRss/resourceData';
import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import {
  addByRssFeedHeaderArtwork,
  buildAddByRssHomeDetailData,
  sortAddByRssHomeEpisodes,
  toAddByRssAboutPeople,
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

  it('sorts episodes by title or newest publication date after a SQLite date round-trip', () => {
    const rows = buildAddByRssHomeDetailData(feed, mappedFeed).episodeRows;
    const reloaded = safeJsonParse<typeof mappedFeed>(JSON.stringify(mappedFeed));
    expect(reloaded).not.toBeNull();
    if (reloaded === null) {
      return;
    }
    const reloadedRows = buildAddByRssHomeDetailData(feed, reloaded).episodeRows;

    expect(sortAddByRssHomeEpisodes(rows, 'alphabetical').map((row) => row.title)).toEqual([
      'Apple',
      'Zebra',
    ]);
    expect(sortAddByRssHomeEpisodes(rows, 'recent').map((row) => row.title)).toEqual([
      'Apple',
      'Zebra',
    ]);
    expect(sortAddByRssHomeEpisodes(reloadedRows, 'recent').map((row) => row.title)).toEqual([
      'Apple',
      'Zebra',
    ]);
  });

  it('sorts oldest first and keeps a missing date last for both date orders', () => {
    const rows = buildAddByRssHomeDetailData(feed, mappedFeed).episodeRows;
    const source = rows[0];
    expect(source).toBeDefined();
    if (source === undefined) {
      return;
    }

    const undated = {
      ...source,
      id: 'rss-1-missing',
      itemBundle: {
        ...source.itemBundle,
        item: {
          ...source.itemBundle.item,
          pub_date: null,
        },
      },
      title: 'Missing',
    };
    const withMissing = [...rows, undated];

    expect(sortAddByRssHomeEpisodes(rows, 'oldest').map((row) => row.title)).toEqual([
      'Zebra',
      'Apple',
    ]);
    expect(sortAddByRssHomeEpisodes(withMissing, 'oldest').map((row) => row.title)).toEqual([
      'Zebra',
      'Apple',
      'Missing',
    ]);
    expect(sortAddByRssHomeEpisodes(withMissing, 'recent').map((row) => row.title)).toEqual([
      'Apple',
      'Zebra',
      'Missing',
    ]);
  });

  it('numbers parsed people from 1 and drops an empty name', () => {
    expect(
      toAddByRssAboutPeople([
        { href: null, img: null, name: '', role: null },
        { href: 'https://example.com/ada', img: null, name: 'Ada', role: 'Host' },
        { href: null, img: 'https://example.com/bea.png', name: 'Bea', role: null },
      ])
    ).toEqual([
      {
        href: 'https://example.com/ada',
        id: 1,
        img: null,
        name: 'Ada',
        personIdText: null,
        role: 'Host',
      },
      {
        href: null,
        id: 2,
        img: 'https://example.com/bea.png',
        name: 'Bea',
        personIdText: null,
        role: null,
      },
    ]);
  });

  it('stamps download ids and builds about, funding, and people from the bundle', () => {
    const rich = convertParsedRSSFeedToCompat({
      description: 'Show notes for the test feed.',
      explicit: false,
      items: [
        {
          duration: 60,
          enclosure: { length: 100, type: 'audio/mpeg', url: 'https://example.com/one.mp3' },
          explicit: false,
          guid: 'with-guid',
          pubDate: new Date('2026-03-01T00:00:00.000Z'),
          title: 'Guided',
        },
        {
          duration: 30,
          enclosure: { length: 50, type: 'audio/mpeg', url: 'https://example.com/two.mp3' },
          explicit: false,
          guid: 'cleared-after-parse',
          pubDate: new Date('2026-03-02T00:00:00.000Z'),
          title: 'Unguided',
        },
      ],
      link: 'https://example.com/show',
      title: 'Example Feed',
    });
    const unguided = rich.items[1];
    expect(unguided).toBeDefined();
    if (unguided === undefined) {
      return;
    }
    unguided.item.guid = null;
    unguided.item.guid_enclosure_url = null;
    rich.channel.funding = [
      { title: 'Skip', url: '' },
      { title: 'Support', url: 'https://example.com/fund' },
      { title: null, url: 'https://example.com/other' },
    ];
    rich.channel.people = [
      { href: null, img: null, name: '', person_group: 'cast', role: null },
      {
        href: 'https://example.com/ada',
        img: 'https://example.com/ada.png',
        name: 'Ada',
        person_group: 'cast',
        role: 'Host',
      },
    ];

    const detail = buildAddByRssHomeDetailData(feed, rich);

    expect(detail.episodeRows[0]?.id).toBe('rss-1-with-guid');
    expect(detail.episodeRows[0]?.itemKey).toBe('with-guid');
    expect(detail.episodeRows[0]?.downloadItemIdText).toBe(
      addByRssDownloadItemIdText(feed.feedUrl, { guid: 'with-guid' }, 0)
    );
    expect(detail.episodeRows[0]?.downloadItem?.id_text).toBe(
      detail.episodeRows[0]?.downloadItemIdText
    );
    expect(detail.episodeRows[1]?.id).toBe('rss-1-1');
    expect(detail.episodeRows[1]?.itemKey).toBe('1');
    expect(detail.episodeRows[1]?.downloadItemIdText).toBe(
      addByRssDownloadItemIdText(feed.feedUrl, { guid: null, guid_enclosure_url: null }, 1)
    );
    expect(detail.episodeRows[1]?.downloadItem?.id_text).toBe(
      detail.episodeRows[1]?.downloadItemIdText
    );

    unguided.enclosures = [];
    const withoutFile = buildAddByRssHomeDetailData(feed, rich).episodeRows[1];
    expect(withoutFile?.downloadItem).toBeNull();
    expect(detail.about.channel_description?.value).toContain('Show notes for the test feed.');
    expect(detail.about.channel_about?.website_link_url).toBe('https://example.com/show');
    expect(detail.about.feed?.url).toBe(feed.feedUrl);
    expect(detail.about.id).toBe(feed.idText);
    expect(detail.fundings).toEqual([
      { id: 1, title: 'Support', url: 'https://example.com/fund' },
      { id: 2, title: null, url: 'https://example.com/other' },
    ]);
    expect(detail.people).toEqual([
      {
        href: 'https://example.com/ada',
        id: 1,
        img: 'https://example.com/ada.png',
        name: 'Ada',
        personIdText: null,
        role: 'Host',
      },
    ]);
    expect(detail.appearances).toEqual([]);
  });

  it('offers People when guests exist only on episodes', () => {
    const guestsOnly = convertParsedRSSFeedToCompat({
      explicit: false,
      items: [
        {
          duration: 60,
          enclosure: { length: 100, type: 'audio/mpeg', url: 'https://example.com/one.mp3' },
          explicit: false,
          guid: 'guest-episode',
          podcastPeople: [{ name: 'Grace Guest' }],
          title: 'With a guest',
        },
      ],
      link: 'https://example.com/show',
      title: 'Example Feed',
    });

    const detail = buildAddByRssHomeDetailData(feed, guestsOnly);

    expect(detail.people).toEqual([]);
    expect(detail.appearances).toEqual([{ img: null, itemCount: 1, name: 'Grace Guest' }]);
  });

  it('builds an about source with only the feed url when the bundle is missing', () => {
    const detail = buildAddByRssHomeDetailData(feed, null);

    expect(detail.episodeRows).toEqual([]);
    expect(detail.fundings).toEqual([]);
    expect(detail.people).toEqual([]);
    expect(detail.appearances).toEqual([]);
    expect(detail.mappedFeed).toBeNull();
    expect(detail.about).toEqual({
      channel_about: { website_link_url: null },
      channel_description: null,
      feed: { url: feed.feedUrl },
      id: feed.idText,
    });
  });

  it('uses the stored feed image for header artwork when the bundle has no channel images', () => {
    const withoutImages = {
      ...mappedFeed,
      channel: {
        ...mappedFeed.channel,
        images: [],
      },
    };

    expect(addByRssFeedHeaderArtwork(feed, withoutImages)).toEqual({
      listUrl: 'https://example.com/feed.png',
      viewerUrl: 'https://example.com/feed.png',
    });
    expect(addByRssFeedHeaderArtwork(feed, null)).toEqual({
      listUrl: 'https://example.com/feed.png',
      viewerUrl: 'https://example.com/feed.png',
    });
  });

  it('gives each episode the playback id of its own resource data', () => {
    const detail = buildAddByRssHomeDetailData(feed, mappedFeed);
    const [first, second] = detail.episodeRows;

    expect(detail.episodeRows).toHaveLength(2);
    for (const episode of detail.episodeRows) {
      expect(episode.playbackMediaId).toBe(
        addByRssPlaybackMediaId(
          toAddByRssItemPlaybackResourceData(
            feed,
            mappedFeed,
            episode.itemBundle,
            episode.itemIndex
          )
        )
      );
    }
    expect(first?.playbackMediaId).not.toBe(second?.playbackMediaId);
  });

  it('hashes a guidless item by its enclosure url', () => {
    const enclosureUrl = 'https://example.com/guidless.mp3';
    const guidlessFeed = convertParsedRSSFeedToCompat({
      explicit: false,
      items: [
        {
          duration: 60,
          enclosure: { length: 100, type: 'audio/mpeg', url: enclosureUrl },
          explicit: false,
          guid: '',
          pubDate: new Date('2026-04-01T00:00:00.000Z'),
          title: 'No Guid',
        },
      ],
      link: feed.feedUrl,
      title: 'Example Feed',
    });

    const episode = buildAddByRssHomeDetailData(feed, guidlessFeed).episodeRows[0];

    expect(episode?.playbackMediaId).toBe(
      getAddByRSSHashId({ feed_url: feed.feedUrl, enclosure_url: enclosureUrl })
    );
  });

  it('sorts tracks in feed order and in the reverse of that order', () => {
    const rows = buildAddByRssHomeDetailData(feed, mappedFeed).episodeRows;

    expect(sortAddByRssHomeEpisodes(rows, 'forward').map((row) => row.title)).toEqual([
      'Zebra',
      'Apple',
    ]);
    expect(sortAddByRssHomeEpisodes(rows, 'backward').map((row) => row.title)).toEqual([
      'Apple',
      'Zebra',
    ]);
  });

  it('lists one local episode on a feed that has not been parsed', () => {
    const local = buildAddByRssLocalItemBundle({
      description: null,
      durationSeconds: 30,
      guid: 'local-ep',
      imageUrl: null,
      mediaUrl: 'https://cdn.example/local.mp3',
      mimeType: 'audio/mpeg',
      pubDate: '2026-04-01T00:00:00.000Z',
      title: 'Local Episode',
    });
    const mapped = mergeAddByRssLocalEpisodes({ feed, localItems: [local], stored: null });
    const detail = buildAddByRssHomeDetailData(feed, mapped, { hasParsedBundle: false });

    expect(detail.hasParsedBundle).toBe(false);
    expect(detail.episodeRows).toHaveLength(1);
    expect(detail.episodeRows[0]?.downloadItemIdText).toBe(
      addByRssDownloadItemIdText(feed.feedUrl, local.item, 0)
    );
  });
});
