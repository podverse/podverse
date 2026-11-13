import { describe, expect, it } from 'vitest';

import type { DTOAddByRSSRemoteItemLookupResult } from '@podverse/helpers/dto';
import type { AddByRSSPublisherListedFeedRef } from '@podverse/parser-mapping';

import {
  deviceListedFeedLookupRefs,
  deviceListedFeedMatches,
  isDeviceListedRequestId,
  isResolvableListedRef,
  planDeviceListedFeeds,
} from './deviceListedFeeds';

const ALBUM_GUID = 'e2e0de71-0000-4000-8000-0000000000b3';
const DIRECTORY_GUID = '11111111-2222-4333-8444-555555555501';
const GUID_ONLY = 'e2e0a5f0-0000-4000-8000-0000000000f1';
const ALBUM_URL = 'https://example.com/album.xml';

const ref = (
  overrides: Partial<AddByRSSPublisherListedFeedRef> &
    Pick<AddByRSSPublisherListedFeedRef, 'feedGuid'>
): AddByRSSPublisherListedFeedRef => ({
  feedUrl: null,
  title: null,
  listedAtChannelLevel: true,
  itemGuids: [],
  ...overrides,
});

const providerFeed = (feedUrl: string): DTOAddByRSSRemoteItemLookupResult => ({
  kind: 'provider_feed',
  provider_feed: {
    index_provider: 'podcast_index',
    provider_feed_id: '42',
    feed_url: feedUrl,
    title: null,
    author: null,
    image_url: null,
  },
});

describe('deviceListedFeedLookupRefs', () => {
  it('sends one channel-level ref per listing, in order', () => {
    expect(
      deviceListedFeedLookupRefs([
        ref({ feedGuid: ALBUM_GUID, feedUrl: ALBUM_URL }),
        ref({ feedGuid: GUID_ONLY }),
      ])
    ).toEqual([
      { feed_guid: ALBUM_GUID, feed_url: ALBUM_URL, item_guid: null },
      { feed_guid: GUID_ONLY, feed_url: null, item_guid: null },
    ]);
  });
});

describe('deviceListedFeedMatches', () => {
  it('fills the directory map from channel results by lowercased guid', () => {
    const matches = deviceListedFeedMatches(
      [ref({ feedGuid: DIRECTORY_GUID.toUpperCase() }), ref({ feedGuid: GUID_ONLY })],
      [
        { kind: 'channel', channel: { id_text: 'chan1', title: 'E2E Music Album', medium_id: 3 } },
        { kind: 'none' },
      ]
    );

    expect([...matches.directoryByFeedGuid.entries()]).toEqual([
      [DIRECTORY_GUID, { channelIdText: 'chan1', title: 'E2E Music Album', mediumId: 3 }],
    ]);
    expect(matches.lookedUpFeedUrlByFeedGuid.size).toBe(0);
  });

  it('keeps a known stub URL only for a channel-level, URL-less, reliable-UUID ref', () => {
    const matches = deviceListedFeedMatches(
      [
        ref({ feedGuid: GUID_ONLY }),
        ref({ feedGuid: ALBUM_GUID, feedUrl: ALBUM_URL }),
        ref({ feedGuid: DIRECTORY_GUID, listedAtChannelLevel: false }),
        ref({ feedGuid: 'not-a-uuid' }),
      ],
      [
        providerFeed('https://stub.example/one.xml'),
        providerFeed('https://stub.example/two.xml'),
        providerFeed('https://stub.example/three.xml'),
        providerFeed('https://stub.example/four.xml'),
      ]
    );

    expect([...matches.lookedUpFeedUrlByFeedGuid.entries()]).toEqual([
      [GUID_ONLY, 'https://stub.example/one.xml'],
    ]);
  });
});

describe('planDeviceListedFeeds', () => {
  it('with no matches, parses URL refs on the device and leaves URL-less refs unresolved', () => {
    const listed = planDeviceListedFeeds({
      refs: [ref({ feedGuid: ALBUM_GUID, feedUrl: ALBUM_URL }), ref({ feedGuid: GUID_ONLY })],
      matches: null,
      newUuid: () => 'uuid-1',
    });

    expect(listed).toEqual([
      expect.objectContaining({
        feedGuid: ALBUM_GUID,
        feedUrl: ALBUM_URL,
        kind: 'add_by_rss',
        requestId: 'device:uuid-1',
      }),
      expect.objectContaining({ feedGuid: GUID_ONLY, kind: 'unresolved', reason: 'no_feed_url' }),
    ]);
  });

  it('links a directory match', () => {
    const refs = [
      ref({ feedGuid: DIRECTORY_GUID, feedUrl: 'https://e2e-seed-music.example/a.xml' }),
    ];
    const listed = planDeviceListedFeeds({
      refs,
      matches: deviceListedFeedMatches(refs, [
        { kind: 'channel', channel: { id_text: 'chan1', title: 'Album', medium_id: 3 } },
      ]),
      newUuid: () => 'unused',
    });

    expect(listed).toEqual([
      expect.objectContaining({ kind: 'directory', channelIdText: 'chan1', mediumId: 3 }),
    ]);
  });
});

describe('isDeviceListedRequestId', () => {
  it('tells device ids from server ids', () => {
    expect(isDeviceListedRequestId('device:abc')).toBe(true);
    expect(isDeviceListedRequestId('abc')).toBe(false);
  });
});

describe('isResolvableListedRef', () => {
  const guidOnly = { feedGuid: GUID_ONLY, feedUrl: null, listedAtChannelLevel: true };

  it('accepts a channel-level guid-only ref with a reliable UUID', () => {
    expect(isResolvableListedRef(guidOnly)).toBe(true);
  });

  it('refuses an item-level ref, a ref with a URL, and a guid that is not a reliable UUID', () => {
    expect(isResolvableListedRef({ ...guidOnly, listedAtChannelLevel: false })).toBe(false);
    expect(isResolvableListedRef({ ...guidOnly, feedUrl: ALBUM_URL })).toBe(false);
    expect(isResolvableListedRef({ ...guidOnly, feedGuid: 'not-a-uuid' })).toBe(false);
  });
});
