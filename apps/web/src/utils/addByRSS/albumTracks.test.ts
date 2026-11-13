import { beforeEach, describe, expect, it, vi } from 'vitest';

const { buildAddByRSSItemsIndexMock, buildItemIdTextMapMock, getAllAddByRSSFeedsMock } = vi.hoisted(
  () => ({
    buildAddByRSSItemsIndexMock: vi.fn(),
    buildItemIdTextMapMock: vi.fn(),
    getAllAddByRSSFeedsMock: vi.fn(),
  })
);

vi.mock('./storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./storage')>();
  return {
    ...actual,
    getAllAddByRSSFeeds: getAllAddByRSSFeedsMock,
  };
});
vi.mock('./itemIndex', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./itemIndex')>();
  return {
    ...actual,
    buildAddByRSSItemsIndex: buildAddByRSSItemsIndexMock,
    buildItemIdTextMap: buildItemIdTextMapMock,
  };
});

import { FeedType, Phase5Blocked } from 'podverse-partytime/core';

import { convertParsedRSSFeedToCompat } from '@podverse/parser-mapping';

import { loadAddByRSSAlbumTrackIndexItems } from './albumTracks';
import type { AddByRSSArtistTrackRef } from './publisherLinks';
import type {
  AddByRSSFeedRecord,
  AddByRSSListedFeedRecord,
  AddByRSSMappedFeed,
  AddByRSSParsedFeed,
} from './types';

const albumMappedFeed = (itemGuids: string[]): AddByRSSMappedFeed => {
  const parsed: AddByRSSParsedFeed = {
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
    lastUpdate: new Date('2024-01-01T00:00:00.000Z'),
    podcastBlocked: Phase5Blocked.No,
  };
  return convertParsedRSSFeedToCompat(parsed);
};

const followedAlbum = (idText: string, itemGuids: string[]): AddByRSSFeedRecord => ({
  id: 1,
  idText,
  resourceType: 'albums',
  feedUrl: `https://example.com/${idText}.xml`,
  title: idText,
  imageUrl: null,
  status: 'parsed',
  updatedAt: '2026-01-01T00:00:00.000Z',
  mappedFeed: albumMappedFeed(itemGuids),
});

const listedAlbum = (
  idText: string,
  itemIdTextsByGuid: Record<string, string>
): AddByRSSListedFeedRecord => ({
  id: 2,
  idText,
  resourceType: 'albums',
  feedUrl: `https://example.com/${idText}.xml`,
  title: idText,
  imageUrl: null,
  status: 'parsed',
  updatedAt: '2026-01-01T00:00:00.000Z',
  mappedFeed: albumMappedFeed(Object.keys(itemIdTextsByGuid)),
  publisherParseRequestId: null,
  itemIdTextsByGuid,
  liveItemIdTextsByGuid: {},
});

const followedRef = (
  feed: AddByRSSFeedRecord,
  itemGuids: ReadonlySet<string> | null = null
): AddByRSSArtistTrackRef => ({ source: { followed: true, feed }, itemGuids });

const listedRef = (
  feed: AddByRSSListedFeedRecord,
  itemGuids: ReadonlySet<string> | null = null
): AddByRSSArtistTrackRef => ({ source: { followed: false, feed }, itemGuids });

describe('loadAddByRSSAlbumTrackIndexItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildAddByRSSItemsIndexMock.mockResolvedValue(0);
  });

  it('uses the index idTexts and does not rebuild when every followed track is indexed', async () => {
    const album = followedAlbum('album-a', ['t1', 't2']);
    buildItemIdTextMapMock.mockResolvedValue(
      new Map([
        ['album-a-t1', 'idx-1'],
        ['album-a-t2', 'idx-2'],
      ])
    );

    const items = await loadAddByRSSAlbumTrackIndexItems([followedRef(album)]);

    expect(buildAddByRSSItemsIndexMock).not.toHaveBeenCalled();
    expect(items.map((item) => item.idText)).toEqual(['idx-1', 'idx-2']);
  });

  it('rebuilds the index once, with every followed feed, when a followed track is missing', async () => {
    const album = followedAlbum('album-a', ['t1', 't2']);
    const otherFollowed = followedAlbum('album-other', ['x1']);
    getAllAddByRSSFeedsMock.mockResolvedValue([album, otherFollowed]);
    buildItemIdTextMapMock
      .mockResolvedValueOnce(new Map([['album-a-t1', 'idx-1']]))
      .mockResolvedValueOnce(
        new Map([
          ['album-a-t1', 'idx-1'],
          ['album-a-t2', 'idx-2'],
          ['album-other-x1', 'idx-x'],
        ])
      );

    const items = await loadAddByRSSAlbumTrackIndexItems([followedRef(album)]);

    expect(buildAddByRSSItemsIndexMock).toHaveBeenCalledTimes(1);
    expect(buildAddByRSSItemsIndexMock).toHaveBeenCalledWith([album, otherFollowed]);
    expect(items.map((item) => item.idText)).toEqual(['idx-1', 'idx-2']);
  });

  it('gives a listed album its stored idTexts and never builds the index', async () => {
    const album = listedAlbum('listed-a', { t1: 'listed-1', t2: 'listed-2' });
    buildItemIdTextMapMock.mockResolvedValue(new Map());

    const items = await loadAddByRSSAlbumTrackIndexItems([listedRef(album)]);

    expect(buildAddByRSSItemsIndexMock).not.toHaveBeenCalled();
    expect(getAllAddByRSSFeedsMock).not.toHaveBeenCalled();
    expect(items.map((item) => item.idText)).toEqual(['listed-1', 'listed-2']);
    expect(items.every((item) => item.channelIdText === 'listed-a')).toBe(true);
  });

  it('returns only the credited tracks when a ref names item guids', async () => {
    const followed = followedAlbum('album-a', ['t1', 't2', 't3']);
    const listed = listedAlbum('listed-a', { l1: 'listed-1', l2: 'listed-2' });
    buildItemIdTextMapMock.mockResolvedValue(
      new Map([
        ['album-a-t1', 'idx-1'],
        ['album-a-t2', 'idx-2'],
        ['album-a-t3', 'idx-3'],
      ])
    );

    const items = await loadAddByRSSAlbumTrackIndexItems([
      followedRef(followed, new Set(['t2'])),
      listedRef(listed, new Set(['l1'])),
    ]);

    expect(items.map((item) => item.itemGuid)).toEqual(['t2', 'l1']);
    expect(items.map((item) => item.idText)).toEqual(['idx-2', 'listed-1']);
  });
});
