import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  bulkRemoveListedAddByRSSFeedsMock,
  emitAddByRSSFeedChangedMock,
  getAllAddByRSSFeedsMock,
  getAllAddByRSSPublisherLinksMock,
  getAllListedAddByRSSFeedsMock,
  removeAddByRSSPublisherLinksMock,
} = vi.hoisted(() => ({
  bulkRemoveListedAddByRSSFeedsMock: vi.fn(),
  emitAddByRSSFeedChangedMock: vi.fn(),
  getAllAddByRSSFeedsMock: vi.fn(),
  getAllAddByRSSPublisherLinksMock: vi.fn(),
  getAllListedAddByRSSFeedsMock: vi.fn(),
  removeAddByRSSPublisherLinksMock: vi.fn(),
}));

vi.mock('./storage', () => ({
  bulkRemoveListedAddByRSSFeeds: bulkRemoveListedAddByRSSFeedsMock,
  getAllAddByRSSFeeds: getAllAddByRSSFeedsMock,
  getAllAddByRSSPublisherLinks: getAllAddByRSSPublisherLinksMock,
  getAllListedAddByRSSFeeds: getAllListedAddByRSSFeedsMock,
  removeAddByRSSPublisherLinks: removeAddByRSSPublisherLinksMock,
}));
vi.mock('./feedChangedEvent', () => ({
  emitAddByRSSFeedChanged: emitAddByRSSFeedChangedMock,
}));

import { FeedType, Phase4LiveStatus, Phase5Blocked } from 'podverse-partytime/core';

import type { AddByRSSPublisherListedFeed } from '@podverse/helpers';
import { convertParsedRSSFeedToCompat } from '@podverse/parser-mapping';

import {
  ADD_BY_RSS_PUBLISHER_LINKS_REFRESH_MS,
  addByRSSPublisherLinksNeedRefresh,
  assignListedLiveItemIdTexts,
  assignListedTrackIdTexts,
  findListedAddByRSSLivestream,
  findListedAddByRSSTrack,
  isListedFeedRecord,
  listedAddByRSSLivestreamIndexItems,
  listedAddByRSSTrackIndexItems,
  normalizeAddByRSSGuid,
  pruneAddByRSSPublisherData,
} from './listedFeeds';
import type {
  AddByRSSFeedRecord,
  AddByRSSListedFeedRecord,
  AddByRSSMappedFeed,
  AddByRSSParsedFeed,
  AddByRSSPublisherLinkRecord,
} from './types';

const albumParsedFeed = (
  itemGuids: string[],
  liveItemGuids: string[] = []
): AddByRSSParsedFeed => ({
  type: FeedType.RSS,
  title: 'Album',
  link: 'https://album.example',
  description: 'An album',
  explicit: false,
  itunesBlock: false,
  itunesComplete: false,
  pc20support: {},
  items: itemGuids.map((guid, index) => ({
    guid,
    title: `Track ${index + 1}`,
    duration: 60,
    explicit: false,
    enclosure: {
      url: `https://album.example/track-${index + 1}.mp3`,
      length: 1,
      type: 'audio/mpeg',
    },
  })),
  podcastLiveItems: liveItemGuids.map((guid, index) => ({
    guid,
    title: `Live ${index + 1}`,
    enclosure: {
      url: `https://album.example/live-${index + 1}.mp3`,
      length: 0,
      type: 'audio/mpeg',
    },
    status: Phase4LiveStatus.Live,
    start: new Date('2025-07-02T15:00:00.000Z'),
    contentLinks: [],
  })),
  lastUpdate: new Date('2024-01-01T00:00:00.000Z'),
  podcastBlocked: Phase5Blocked.No,
});

const albumMappedFeed = (itemGuids: string[], liveItemGuids: string[] = []): AddByRSSMappedFeed =>
  convertParsedRSSFeedToCompat(albumParsedFeed(itemGuids, liveItemGuids));

const listedRecord = (
  feedUrl: string,
  idText: string,
  overrides: Partial<AddByRSSListedFeedRecord> = {}
): AddByRSSListedFeedRecord => ({
  id: 1,
  idText,
  resourceType: 'albums',
  feedUrl,
  title: 'Album',
  imageUrl: null,
  status: 'parsed',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publisherParseRequestId: null,
  itemIdTextsByGuid: {},
  liveItemIdTextsByGuid: {},
  ...overrides,
});

const followedFeed = (feedUrl: string, idText: string): AddByRSSFeedRecord => ({
  id: 2,
  idText,
  resourceType: 'artists',
  feedUrl,
  title: 'Artist',
  imageUrl: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const listedRow = (feedUrl: string): AddByRSSPublisherListedFeed => ({
  kind: 'add_by_rss',
  feedGuid: `guid-${feedUrl}`,
  feedUrl,
  title: null,
  listedAtChannelLevel: true,
  itemGuids: [],
  requestId: `request-${feedUrl}`,
});

const link = (
  publisherFeedUrl: string,
  listedFeeds: AddByRSSPublisherListedFeed[],
  updatedAt = '2026-01-01T00:00:00.000Z'
): AddByRSSPublisherLinkRecord => ({
  publisherFeedUrl,
  publisherIdText: `id-${publisherFeedUrl}`,
  publisherTitle: 'Artist',
  publisherGuid: null,
  listedFeeds,
  updatedAt,
});

describe('normalizeAddByRSSGuid', () => {
  it('trims and lowercases a guid, and gives null for an empty one', () => {
    expect(normalizeAddByRSSGuid('  ABC-Def-123 ')).toBe('abc-def-123');
    expect(normalizeAddByRSSGuid('')).toBeNull();
    expect(normalizeAddByRSSGuid('   ')).toBeNull();
    expect(normalizeAddByRSSGuid(null)).toBeNull();
    expect(normalizeAddByRSSGuid(undefined)).toBeNull();
  });
});

describe('assignListedTrackIdTexts', () => {
  it('keeps an existing track idText, adds one for a new guid, and keys a guidless item by position', () => {
    const record = listedRecord('https://album.example/feed.xml', 'album-id', {
      mappedFeed: albumMappedFeed(['track-1', 'track-2', '']),
      itemIdTextsByGuid: { 'track-1': 'kept-track-id' },
    });

    const result = assignListedTrackIdTexts(record);

    expect(result.itemIdTextsByGuid['track-1']).toBe('kept-track-id');
    expect(result.itemIdTextsByGuid['track-2']).toEqual(expect.any(String));
    expect(result.itemIdTextsByGuid['track-2']).not.toBe('kept-track-id');
    expect(result.itemIdTextsByGuid['album-id-2']).toEqual(expect.any(String));
    expect(Object.keys(result.itemIdTextsByGuid)).toHaveLength(3);
  });
});

describe('listedAddByRSSTrackIndexItems', () => {
  it('returns one item per track with its stored idText and the album as its channel', () => {
    const record = assignListedTrackIdTexts(
      listedRecord('https://album.example/feed.xml', 'album-id', {
        mappedFeed: albumMappedFeed(['track-1', 'track-2']),
      })
    );

    const items = listedAddByRSSTrackIndexItems(record);

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.idText)).toEqual([
      record.itemIdTextsByGuid['track-1'],
      record.itemIdTextsByGuid['track-2'],
    ]);
    expect(items.every((item) => item.channelIdText === 'album-id')).toBe(true);
    expect(items.map((item) => item.itemGuid)).toEqual(['track-1', 'track-2']);
  });
});

describe('findListedAddByRSSTrack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the listed album and the track with that idText, and null for an unknown idText', async () => {
    const record = assignListedTrackIdTexts(
      listedRecord('https://album.example/feed.xml', 'album-id', {
        mappedFeed: albumMappedFeed(['track-1', 'track-2']),
      })
    );
    const trackIdText = record.itemIdTextsByGuid['track-2'];
    getAllListedAddByRSSFeedsMock.mockResolvedValue([
      listedRecord('https://other.example/feed.xml', 'other-id'),
      record,
    ]);

    const found = await findListedAddByRSSTrack(trackIdText ?? '');

    expect(found?.feed.idText).toBe('album-id');
    expect(found?.item.idText).toBe(trackIdText);
    expect(found?.item.itemGuid).toBe('track-2');
    expect(await findListedAddByRSSTrack('unknown-id')).toBeNull();
  });
});

describe('isListedFeedRecord', () => {
  it('is true for a listed record and false for a followed one', () => {
    expect(isListedFeedRecord(listedRecord('https://album.example/feed.xml', 'album-id'))).toBe(
      true
    );
    expect(isListedFeedRecord(followedFeed('https://album.example/feed.xml', 'album-id'))).toBe(
      false
    );
    expect(isListedFeedRecord(null)).toBe(false);
  });
});

describe('assignListedLiveItemIdTexts', () => {
  it('keeps an existing livestream idText, adds one for a new guid, and keys a guidless live item by position', () => {
    const mappedFeed = albumMappedFeed([], ['live-1', 'live-2', 'no-guid']);
    const guidless = mappedFeed.liveItems[2];
    if (guidless !== undefined) {
      Object.assign(guidless.item, { guid: undefined });
    }
    const record = listedRecord('https://album.example/feed.xml', 'album-id', {
      mappedFeed,
      liveItemIdTextsByGuid: { 'live-1': 'kept-live-id' },
    });

    const result = assignListedLiveItemIdTexts(record);

    expect(result.liveItemIdTextsByGuid['live-1']).toBe('kept-live-id');
    expect(result.liveItemIdTextsByGuid['live-2']).toEqual(expect.any(String));
    expect(result.liveItemIdTextsByGuid['live-2']).not.toBe('kept-live-id');
    expect(result.liveItemIdTextsByGuid['album-id-2']).toEqual(expect.any(String));
    expect(Object.keys(result.liveItemIdTextsByGuid)).toHaveLength(3);
  });
});

describe('listedAddByRSSLivestreamIndexItems', () => {
  it('returns one item per live item with its stored idText and the album as its channel', () => {
    const record = assignListedLiveItemIdTexts(
      listedRecord('https://album.example/feed.xml', 'album-id', {
        mappedFeed: albumMappedFeed(['track-1'], ['live-1', 'live-2']),
      })
    );

    const items = listedAddByRSSLivestreamIndexItems(record);

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.idText)).toEqual([
      record.liveItemIdTextsByGuid['live-1'],
      record.liveItemIdTextsByGuid['live-2'],
    ]);
    expect(items.every((item) => item.channelIdText === 'album-id')).toBe(true);
    expect(items.map((item) => item.itemGuid)).toEqual(['live-1', 'live-2']);
  });
});

describe('findListedAddByRSSLivestream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the listed album and the livestream with that idText, and null for an unknown idText', async () => {
    const record = assignListedLiveItemIdTexts(
      listedRecord('https://album.example/feed.xml', 'album-id', {
        mappedFeed: albumMappedFeed([], ['live-1']),
      })
    );
    const liveIdText = record.liveItemIdTextsByGuid['live-1'];
    getAllListedAddByRSSFeedsMock.mockResolvedValue([
      listedRecord('https://other.example/feed.xml', 'other-id'),
      record,
    ]);

    const found = await findListedAddByRSSLivestream(liveIdText ?? '');

    expect(found?.feed.idText).toBe('album-id');
    expect(found?.item.idText).toBe(liveIdText);
    expect(found?.item.itemGuid).toBe('live-1');
    expect(await findListedAddByRSSLivestream('unknown-id')).toBeNull();
  });
});

describe('addByRSSPublisherLinksNeedRefresh', () => {
  const nowMs = Date.parse('2026-06-02T12:00:00.000Z');
  const hoursAgo = (hours: number): string =>
    new Date(nowMs - hours * 60 * 60 * 1000).toISOString();

  it('needs a refresh when no list is stored', () => {
    expect(addByRSSPublisherLinksNeedRefresh(null, nowMs)).toBe(true);
  });

  it('keeps a list stored within the refresh window', () => {
    expect(
      addByRSSPublisherLinksNeedRefresh(link('https://a.example/feed.xml', [], hoursAgo(1)), nowMs)
    ).toBe(false);
  });

  it('refreshes a list stored 25 hours ago or with an unreadable time', () => {
    expect(ADD_BY_RSS_PUBLISHER_LINKS_REFRESH_MS).toBe(24 * 60 * 60 * 1000);
    expect(
      addByRSSPublisherLinksNeedRefresh(link('https://a.example/feed.xml', [], hoursAgo(25)), nowMs)
    ).toBe(true);
    expect(
      addByRSSPublisherLinksNeedRefresh(link('https://a.example/feed.xml', [], 'not a date'), nowMs)
    ).toBe(true);
  });
});

describe('pruneAddByRSSPublisherData', () => {
  const ARTIST_A = 'https://artist-a.example/feed.xml';
  const ARTIST_B = 'https://artist-b.example/feed.xml';
  const SHARED_ALBUM = 'https://album-shared.example/feed.xml';
  const ALBUM_A = 'https://album-a.example/feed.xml';
  const ALBUM_B = 'https://album-b.example/feed.xml';

  beforeEach(() => {
    vi.clearAllMocks();
    removeAddByRSSPublisherLinksMock.mockResolvedValue(undefined);
    bulkRemoveListedAddByRSSFeedsMock.mockResolvedValue(undefined);
  });

  it('removes the unfollowed artist and the album only it listed, and keeps albums a followed artist lists', async () => {
    getAllAddByRSSFeedsMock.mockResolvedValue([
      followedFeed('https://ARTIST-A.example/feed.xml', 'artist-a'),
    ]);
    getAllAddByRSSPublisherLinksMock.mockResolvedValue([
      link(ARTIST_A, [listedRow(SHARED_ALBUM), listedRow(ALBUM_A)]),
      link(ARTIST_B, [listedRow(SHARED_ALBUM), listedRow(ALBUM_B)]),
    ]);
    getAllListedAddByRSSFeedsMock.mockResolvedValue([
      listedRecord('https://ALBUM-SHARED.example/feed.xml', 'shared-id'),
      listedRecord(ALBUM_A, 'album-a-id'),
      listedRecord(ALBUM_B, 'album-b-id'),
    ]);

    const removed = await pruneAddByRSSPublisherData();

    expect(removeAddByRSSPublisherLinksMock).toHaveBeenCalledWith([ARTIST_B]);
    expect(bulkRemoveListedAddByRSSFeedsMock).toHaveBeenCalledWith(['album-b-id']);
    expect(removed).toEqual([ARTIST_B, ALBUM_B]);
    expect(emitAddByRSSFeedChangedMock.mock.calls.map(([feedUrl]) => feedUrl)).toEqual([
      ARTIST_B,
      ALBUM_B,
    ]);
  });

  it('keeps http and https forms of a feed apart, as canonicalAddByRSSFeedUrl does', async () => {
    getAllAddByRSSFeedsMock.mockResolvedValue([followedFeed(ARTIST_A, 'artist-a')]);
    getAllAddByRSSPublisherLinksMock.mockResolvedValue([
      link(ARTIST_A, [listedRow('http://album-a.example/feed.xml')]),
    ]);
    getAllListedAddByRSSFeedsMock.mockResolvedValue([
      listedRecord('http://album-a.example/feed.xml', 'http-id'),
      listedRecord(ALBUM_A, 'https-id'),
    ]);

    const removed = await pruneAddByRSSPublisherData();

    expect(removeAddByRSSPublisherLinksMock).toHaveBeenCalledWith([]);
    expect(bulkRemoveListedAddByRSSFeedsMock).toHaveBeenCalledWith(['https-id']);
    expect(removed).toEqual([ALBUM_A]);
  });
});
