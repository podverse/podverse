import { describe, expect, it } from 'vitest';

import { convertParsedRSSFeedToCompat } from '../compat/partytime/compatFull.js';
import type { FeedObject, Phase6RemoteItem } from '../types/partytime.js';
import { Phase4Medium } from '../types/partytime.js';
import type { AddByRSSPublisherListedFeedRef } from './publisherListedFeeds.js';
import {
  ADD_BY_RSS_PUBLISHER_LISTED_FEEDS_MAX,
  collectAddByRSSPublisherListedFeedRefs,
  collectAddByRSSPublisherListedFeedRefsFromMappedFeed,
  planAddByRSSPublisherListedFeeds,
} from './publisherListedFeeds.js';

const publisherFeedUrl = 'https://artist.example/feed.xml';

function feed(overrides: Partial<FeedObject> = {}): FeedObject {
  return {
    title: 'Artist',
    explicit: false,
    link: 'https://artist.example',
    items: [],
    guid: 'artist-guid',
    ...overrides,
  };
}

function remote(feedGuid: string, overrides: Partial<Phase6RemoteItem> = {}): Phase6RemoteItem {
  return {
    feedGuid,
    medium: Phase4Medium.Music,
    ...overrides,
  };
}

function ref(
  overrides: Partial<AddByRSSPublisherListedFeedRef> = {}
): AddByRSSPublisherListedFeedRef {
  return {
    feedGuid: 'album-guid',
    feedUrl: 'https://album.example/feed.xml',
    title: 'Album',
    listedAtChannelLevel: true,
    itemGuids: [],
    ...overrides,
  };
}

function requestIdSource(): { calls: string[]; newRequestId: () => string } {
  const calls: string[] = [];
  return {
    calls,
    newRequestId: () => {
      const requestId = `req-${calls.length + 1}`;
      calls.push(requestId);
      return requestId;
    },
  };
}

describe('collectAddByRSSPublisherListedFeedRefs', () => {
  it('returns channel-level references in feed order with canonical URLs', () => {
    const result = collectAddByRSSPublisherListedFeedRefs(
      feed({
        podcastRemoteItems: [
          remote('album-a', {
            feedUrl: 'https://User:pw@Album-A.Example/a.xml',
            title: ' Album A ',
          }),
          remote('album-b', {
            feedUrl: 'https://album-b.example/b.xml',
            title: 'Album B',
          }),
        ],
      }),
      publisherFeedUrl
    );

    expect(result.droppedCount).toBe(0);
    expect(result.refs).toEqual([
      {
        feedGuid: 'album-a',
        feedUrl: 'https://album-a.example/a.xml',
        title: 'Album A',
        listedAtChannelLevel: true,
        itemGuids: [],
      },
      {
        feedGuid: 'album-b',
        feedUrl: 'https://album-b.example/b.xml',
        title: 'Album B',
        listedAtChannelLevel: true,
        itemGuids: [],
      },
    ]);
  });

  it('groups a channel-level and an item-level reference to one guid', () => {
    const result = collectAddByRSSPublisherListedFeedRefs(
      feed({
        podcastRemoteItems: [
          remote('Album-Guid', {
            feedUrl: 'https://album.example/feed.xml',
            title: 'From channel',
          }),
          remote('album-guid', {
            feedUrl: 'https://other.example/feed.xml',
            itemGuid: 'track-1',
            title: 'From item',
          }),
        ],
      }),
      publisherFeedUrl
    );

    expect(result.droppedCount).toBe(0);
    expect(result.refs).toEqual([
      {
        feedGuid: 'Album-Guid',
        feedUrl: 'https://album.example/feed.xml',
        title: 'From channel',
        listedAtChannelLevel: true,
        itemGuids: ['track-1'],
      },
    ]);
  });

  it('marks a guid named only by item-level references as not listed at channel level', () => {
    const result = collectAddByRSSPublisherListedFeedRefs(
      feed({
        podcastRemoteItems: [
          remote('album-guid', {
            feedUrl: 'https://album.example/feed.xml',
            itemGuid: 'track-9',
            title: 'Track credit',
          }),
        ],
      }),
      publisherFeedUrl
    );

    expect(result.refs).toEqual([
      {
        feedGuid: 'album-guid',
        feedUrl: 'https://album.example/feed.xml',
        title: 'Track credit',
        listedAtChannelLevel: false,
        itemGuids: ['track-9'],
      },
    ]);
  });

  it('leaves out a reference whose medium is publisher', () => {
    const result = collectAddByRSSPublisherListedFeedRefs(
      feed({
        podcastRemoteItems: [
          remote('label-guid', {
            feedUrl: 'https://label.example/feed.xml',
            medium: Phase4Medium.Publisher,
            title: 'Label',
          }),
          remote('album-guid', {
            feedUrl: 'https://album.example/feed.xml',
            title: 'Album',
          }),
        ],
      }),
      publisherFeedUrl
    );

    expect(result.refs.map((listed) => listed.feedGuid)).toEqual(['album-guid']);
  });

  it('leaves out a reference to the publisher feed guid and one to its own URL', () => {
    const result = collectAddByRSSPublisherListedFeedRefs(
      feed({
        guid: 'Artist-GUID',
        podcastRemoteItems: [
          remote('artist-guid', {
            feedUrl: 'https://elsewhere.example/a.xml',
            title: 'Own guid',
          }),
          remote('other-guid', {
            feedUrl: 'https://User:pw@Artist.Example/feed.xml',
            title: 'Own url',
          }),
          remote('kept', {
            feedUrl: 'https://kept.example/feed.xml',
            title: 'Kept',
          }),
        ],
      }),
      publisherFeedUrl
    );

    expect(result.refs).toEqual([
      {
        feedGuid: 'kept',
        feedUrl: 'https://kept.example/feed.xml',
        title: 'Kept',
        listedAtChannelLevel: true,
        itemGuids: [],
      },
    ]);
  });

  it('keeps the first 100 distinct feeds and reports one dropped', () => {
    const podcastRemoteItems = Array.from({ length: 101 }, (_, index) =>
      remote(`guid-${index}`, { feedUrl: `https://album.example/${index}.xml` })
    );
    const result = collectAddByRSSPublisherListedFeedRefs(
      feed({ podcastRemoteItems }),
      publisherFeedUrl
    );

    expect(ADD_BY_RSS_PUBLISHER_LISTED_FEEDS_MAX).toBe(100);
    expect(result.refs).toHaveLength(100);
    expect(result.droppedCount).toBe(1);
    expect(result.refs[0]?.feedGuid).toBe('guid-0');
    expect(result.refs[99]?.feedGuid).toBe('guid-99');
  });
});

describe('collectAddByRSSPublisherListedFeedRefsFromMappedFeed', () => {
  it('returns the same refs as the parsed-feed entry point and skips the feed own guid', () => {
    const parsedFeed = feed({
      guid: 'Artist-GUID',
      podcastRemoteItems: [
        remote('artist-guid', { feedUrl: 'https://elsewhere.example/own.xml' }),
        remote('album-a', { feedUrl: 'https://album-a.example/a.xml', title: 'Album A' }),
        remote('album-b', { itemGuid: 'track-1', title: 'Track credit' }),
        remote('album-c', { title: 'Guid only' }),
      ],
    });

    const fromParsed = collectAddByRSSPublisherListedFeedRefs(parsedFeed, publisherFeedUrl);
    const fromMapped = collectAddByRSSPublisherListedFeedRefsFromMappedFeed(
      convertParsedRSSFeedToCompat(parsedFeed),
      publisherFeedUrl
    );

    expect(fromMapped).toEqual(fromParsed);
    expect(fromMapped.refs.map((listed) => listed.feedGuid)).toEqual([
      'album-a',
      'album-b',
      'album-c',
    ]);
  });
});

describe('planAddByRSSPublisherListedFeeds', () => {
  it('links a directory match and does not allocate a request id', () => {
    const ids = requestIdSource();
    const result = planAddByRSSPublisherListedFeeds({
      refs: [ref({ feedGuid: 'Album-Guid' })],
      directoryByFeedGuid: new Map([
        ['album-guid', { channelIdText: 'ch-1', title: 'Directory Album', mediumId: 3 }],
      ]),
      lookedUpFeedUrlByFeedGuid: new Map([['album-guid', 'https://lookup.example/unused.xml']]),
      newRequestId: ids.newRequestId,
    });

    expect(ids.calls).toEqual([]);
    expect(result.feedsToParse).toEqual([]);
    expect(result.listedFeeds).toEqual([
      {
        feedGuid: 'Album-Guid',
        feedUrl: 'https://album.example/feed.xml',
        title: 'Album',
        listedAtChannelLevel: true,
        itemGuids: [],
        kind: 'directory',
        channelIdText: 'ch-1',
        channelTitle: 'Directory Album',
        mediumId: 3,
      },
    ]);
  });

  it('leaves an item-level-only ref unresolved when it is not in the directory', () => {
    const ids = requestIdSource();
    const result = planAddByRSSPublisherListedFeeds({
      refs: [
        ref({
          listedAtChannelLevel: false,
          itemGuids: ['track-1'],
          feedUrl: 'https://album.example/feed.xml',
        }),
      ],
      directoryByFeedGuid: new Map(),
      lookedUpFeedUrlByFeedGuid: new Map(),
      newRequestId: ids.newRequestId,
    });

    expect(ids.calls).toEqual([]);
    expect(result.feedsToParse).toEqual([]);
    expect(result.listedFeeds).toEqual([
      {
        feedGuid: 'album-guid',
        feedUrl: 'https://album.example/feed.xml',
        title: 'Album',
        listedAtChannelLevel: false,
        itemGuids: ['track-1'],
        kind: 'unresolved',
        reason: 'item_references_only',
      },
    ]);
  });

  it('uses a looked-up URL when the ref has none, and reports no_feed_url when neither exists', () => {
    const ids = requestIdSource();
    const result = planAddByRSSPublisherListedFeeds({
      refs: [
        ref({ feedGuid: 'looked-up', feedUrl: null, title: null }),
        ref({ feedGuid: 'missing', feedUrl: null, title: null }),
      ],
      directoryByFeedGuid: new Map(),
      lookedUpFeedUrlByFeedGuid: new Map([
        ['looked-up', 'https://User:pw@Lookup.Example/album.xml'],
      ]),
      newRequestId: ids.newRequestId,
    });

    expect(ids.calls).toEqual(['req-1']);
    expect(result.feedsToParse).toEqual([
      {
        requestId: 'req-1',
        feedUrl: 'https://lookup.example/album.xml',
        feedGuid: 'looked-up',
      },
    ]);
    expect(result.listedFeeds).toEqual([
      {
        feedGuid: 'looked-up',
        feedUrl: 'https://lookup.example/album.xml',
        title: null,
        listedAtChannelLevel: true,
        itemGuids: [],
        kind: 'add_by_rss',
        requestId: 'req-1',
      },
      {
        feedGuid: 'missing',
        feedUrl: null,
        title: null,
        listedAtChannelLevel: true,
        itemGuids: [],
        kind: 'unresolved',
        reason: 'no_feed_url',
      },
    ]);
  });

  it('parses two guids that name one URL under one request id', () => {
    const ids = requestIdSource();
    const sharedUrl = 'https://shared.example/feed.xml';
    const result = planAddByRSSPublisherListedFeeds({
      refs: [
        ref({ feedGuid: 'guid-a', feedUrl: sharedUrl, title: 'First' }),
        ref({ feedGuid: 'guid-b', feedUrl: sharedUrl, title: 'Second' }),
      ],
      directoryByFeedGuid: new Map(),
      lookedUpFeedUrlByFeedGuid: new Map(),
      newRequestId: ids.newRequestId,
    });

    expect(ids.calls).toEqual(['req-1']);
    expect(result.feedsToParse).toEqual([
      { requestId: 'req-1', feedUrl: sharedUrl, feedGuid: 'guid-a' },
    ]);
    expect(result.listedFeeds).toEqual([
      {
        feedGuid: 'guid-a',
        feedUrl: sharedUrl,
        title: 'First',
        listedAtChannelLevel: true,
        itemGuids: [],
        kind: 'add_by_rss',
        requestId: 'req-1',
      },
      {
        feedGuid: 'guid-b',
        feedUrl: sharedUrl,
        title: 'Second',
        listedAtChannelLevel: true,
        itemGuids: [],
        kind: 'add_by_rss',
        requestId: 'req-1',
      },
    ]);
  });
});
