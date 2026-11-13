import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  bulkRemoveListedAddByRSSFeedsMock,
  claimAddByRSSParseInFlightMock,
  emitAddByRSSFeedChangedMock,
  enqueueAddByRSSParseMock,
  followAddByRSSChannelMock,
  getAddByRSSFeedByUrlMock,
  getAddByRSSParseStatusMock,
  getAllAddByRSSFeedsMock,
  getAllAddByRSSPublisherLinksMock,
  getAllListedAddByRSSFeedsMock,
  getCredentialsMock,
  getListedAddByRSSFeedByUrlMock,
  markAddByRSSParseInFlightMock,
  releaseAddByRSSParseInFlightMock,
  removeAddByRSSPublisherLinksMock,
  upsertAddByRSSFeedMock,
  upsertAddByRSSPublisherLinkMock,
  upsertListedAddByRSSFeedMock,
} = vi.hoisted(() => ({
  bulkRemoveListedAddByRSSFeedsMock: vi.fn(),
  claimAddByRSSParseInFlightMock: vi.fn(),
  emitAddByRSSFeedChangedMock: vi.fn(),
  enqueueAddByRSSParseMock: vi.fn(),
  followAddByRSSChannelMock: vi.fn(),
  getAddByRSSFeedByUrlMock: vi.fn(),
  getAddByRSSParseStatusMock: vi.fn(),
  getAllAddByRSSFeedsMock: vi.fn(),
  getAllAddByRSSPublisherLinksMock: vi.fn(),
  getAllListedAddByRSSFeedsMock: vi.fn(),
  getCredentialsMock: vi.fn(),
  getListedAddByRSSFeedByUrlMock: vi.fn(),
  markAddByRSSParseInFlightMock: vi.fn(),
  releaseAddByRSSParseInFlightMock: vi.fn(),
  removeAddByRSSPublisherLinksMock: vi.fn(),
  upsertAddByRSSFeedMock: vi.fn(),
  upsertAddByRSSPublisherLinkMock: vi.fn(),
  upsertListedAddByRSSFeedMock: vi.fn(),
}));

vi.mock('./api', () => ({
  enqueueAddByRSSParse: enqueueAddByRSSParseMock,
  followAddByRSSChannel: followAddByRSSChannelMock,
  getAddByRSSParseStatus: getAddByRSSParseStatusMock,
  unfollowAddByRSSChannel: vi.fn(),
}));
vi.mock('./storage', () => ({
  bulkRemoveListedAddByRSSFeeds: bulkRemoveListedAddByRSSFeedsMock,
  getAddByRSSFeedByUrl: getAddByRSSFeedByUrlMock,
  getAllAddByRSSFeeds: getAllAddByRSSFeedsMock,
  getAllAddByRSSPublisherLinks: getAllAddByRSSPublisherLinksMock,
  getAllListedAddByRSSFeeds: getAllListedAddByRSSFeedsMock,
  getListedAddByRSSFeedByUrl: getListedAddByRSSFeedByUrlMock,
  removeAddByRSSFeed: vi.fn(),
  removeAddByRSSPublisherLinks: removeAddByRSSPublisherLinksMock,
  upsertAddByRSSFeed: upsertAddByRSSFeedMock,
  upsertAddByRSSPublisherLink: upsertAddByRSSPublisherLinkMock,
  upsertListedAddByRSSFeed: upsertListedAddByRSSFeedMock,
}));
vi.mock('./feedChangedEvent', () => ({
  emitAddByRSSFeedChanged: emitAddByRSSFeedChangedMock,
}));
vi.mock('./parseInFlight', () => ({
  claimAddByRSSParseInFlight: claimAddByRSSParseInFlightMock,
  markAddByRSSParseInFlight: markAddByRSSParseInFlightMock,
  releaseAddByRSSParseInFlight: releaseAddByRSSParseInFlightMock,
}));
vi.mock('./credentialStore', () => ({
  deleteCredentials: vi.fn(),
  getCredentials: getCredentialsMock,
  setCredentials: vi.fn(),
}));

import { FeedType, Phase4LiveStatus, Phase5Blocked } from 'podverse-partytime/core';

import type { AddByRSSPublisherListedFeed } from '@podverse/helpers';
import { convertParsedRSSFeedToCompat } from '@podverse/parser-mapping';

import {
  applyAddByRSSParseStatus,
  followAddByRSSChannelAndQueue,
  resumeListedAddByRSSPolls,
} from './actions';
import type { AddByRSSParseStatusResponse } from './api';
import type { AddByRSSFeedRecord, AddByRSSListedFeedRecord, AddByRSSParsedFeed } from './types';

const ARTIST_URL = 'https://artist.example/feed.xml';
const ALBUM_URL = 'https://album.example/feed.xml';

const parsedFeed = (params: {
  title: string;
  guid?: string;
  itemGuids?: string[];
  liveItemGuids?: string[];
}): AddByRSSParsedFeed => ({
  type: FeedType.RSS,
  title: params.title,
  link: 'https://example.com',
  description: 'A feed',
  explicit: false,
  itunesBlock: false,
  itunesComplete: false,
  pc20support: {},
  guid: params.guid,
  items: (params.itemGuids ?? []).map((guid, index) => ({
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
  podcastLiveItems: (params.liveItemGuids ?? []).map((guid, index) => ({
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

const artistRecord: AddByRSSFeedRecord = {
  id: 1,
  idText: 'artist-id',
  resourceType: 'artists',
  feedUrl: ARTIST_URL,
  title: 'Artist',
  imageUrl: null,
  status: 'queued',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const listedAlbum = (
  overrides: Partial<AddByRSSListedFeedRecord> = {}
): AddByRSSListedFeedRecord => ({
  id: 2,
  idText: 'album-id',
  resourceType: 'albums',
  feedUrl: ALBUM_URL,
  title: 'Album',
  imageUrl: null,
  status: 'queued',
  updatedAt: '2024-01-01T00:00:00.000Z',
  publisherParseRequestId: 'album-request',
  itemIdTextsByGuid: {},
  liveItemIdTextsByGuid: {},
  ...overrides,
});

const parsedListedAlbum = (): AddByRSSListedFeedRecord =>
  listedAlbum({
    status: 'parsed',
    mappedFeed: convertParsedRSSFeedToCompat(
      parsedFeed({ title: 'Album', itemGuids: ['track-1'] })
    ),
    itemIdTextsByGuid: { 'track-1': 'track-id' },
  });

const rowBase = {
  title: null,
  listedAtChannelLevel: true,
  itemGuids: [],
};

const listedFeeds: AddByRSSPublisherListedFeed[] = [
  {
    ...rowBase,
    kind: 'directory',
    feedGuid: 'directory-guid',
    feedUrl: 'https://directory.example/feed.xml',
    channelIdText: 'directory-channel',
    channelTitle: 'Directory Album',
    mediumId: null,
  },
  {
    ...rowBase,
    kind: 'add_by_rss',
    feedGuid: 'album-guid',
    feedUrl: ALBUM_URL,
    requestId: 'album-request',
  },
  {
    ...rowBase,
    kind: 'unresolved',
    feedGuid: 'unresolved-guid',
    feedUrl: null,
    reason: 'no_feed_url',
  },
];

const statusResponse = (
  overrides: Partial<AddByRSSParseStatusResponse>
): AddByRSSParseStatusResponse => ({
  requestId: 'album-request',
  accountId: 1,
  feedUrl: ALBUM_URL,
  status: 'parsed',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

describe('Add by RSS artist listed albums', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    getAddByRSSFeedByUrlMock.mockResolvedValue(artistRecord);
    getListedAddByRSSFeedByUrlMock.mockResolvedValue(null);
    getAllAddByRSSFeedsMock.mockResolvedValue([artistRecord]);
    getAllAddByRSSPublisherLinksMock.mockResolvedValue([]);
    getAllListedAddByRSSFeedsMock.mockResolvedValue([]);
    removeAddByRSSPublisherLinksMock.mockResolvedValue(undefined);
    bulkRemoveListedAddByRSSFeedsMock.mockResolvedValue(undefined);
    upsertAddByRSSFeedMock.mockResolvedValue(undefined);
    upsertAddByRSSPublisherLinkMock.mockResolvedValue(undefined);
    upsertListedAddByRSSFeedMock.mockResolvedValue(undefined);
    claimAddByRSSParseInFlightMock.mockReturnValue(true);
    getCredentialsMock.mockResolvedValue(null);
  });

  it('stores the artist list and one queued listed album when a parsed artist lists feeds', async () => {
    getAddByRSSParseStatusMock.mockReturnValue(new Promise(() => undefined));

    await applyAddByRSSParseStatus({
      feedUrl: ARTIST_URL,
      parsedFeed: parsedFeed({ title: 'Artist', guid: ' ARTIST-Guid ' }),
      status: 'parsed',
      outcome: { publisherListedFeeds: listedFeeds },
    });

    await vi.waitFor(() => {
      expect(upsertListedAddByRSSFeedMock).toHaveBeenCalledTimes(1);
    });
    expect(upsertAddByRSSPublisherLinkMock).toHaveBeenCalledTimes(1);
    expect(upsertAddByRSSPublisherLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        publisherFeedUrl: ARTIST_URL,
        publisherIdText: 'artist-id',
        publisherTitle: 'Artist',
        publisherGuid: 'artist-guid',
        listedFeeds,
      })
    );
    expect(upsertListedAddByRSSFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        feedUrl: ALBUM_URL,
        resourceType: 'albums',
        status: 'queued',
        publisherParseRequestId: 'album-request',
        itemIdTextsByGuid: {},
        liveItemIdTextsByGuid: {},
      })
    );
    await vi.waitFor(() => {
      expect(getAddByRSSParseStatusMock).toHaveBeenCalledWith('album-request');
    });
    expect(upsertAddByRSSFeedMock).toHaveBeenCalledTimes(1);
  });

  it('writes no list for a parse without publisherListedFeeds or a not_modified parse', async () => {
    await applyAddByRSSParseStatus({
      feedUrl: ARTIST_URL,
      parsedFeed: parsedFeed({ title: 'Artist' }),
      status: 'parsed',
      outcome: { credentialsState: 'sent' },
    });
    await applyAddByRSSParseStatus({
      feedUrl: ARTIST_URL,
      parsedFeed: undefined,
      status: 'not_modified',
      outcome: { publisherListedFeeds: listedFeeds },
    });

    expect(upsertAddByRSSPublisherLinkMock).not.toHaveBeenCalled();
    expect(upsertListedAddByRSSFeedMock).not.toHaveBeenCalled();
  });

  it('applies a listed album parse to the listed store only', async () => {
    getAddByRSSParseStatusMock.mockResolvedValue(
      statusResponse({
        payload: parsedFeed({
          title: 'Album',
          itemGuids: ['track-1', 'track-2'],
          liveItemGuids: ['live-1'],
        }),
      })
    );

    await resumeListedAddByRSSPolls([listedAlbum()]);

    expect(claimAddByRSSParseInFlightMock).toHaveBeenCalledWith(`listed:${ALBUM_URL}`);
    expect(upsertListedAddByRSSFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        feedUrl: ALBUM_URL,
        status: 'parsed',
        mappedFeed: expect.objectContaining({ items: expect.any(Array) }),
        itemIdTextsByGuid: {
          'track-1': expect.any(String),
          'track-2': expect.any(String),
        },
        liveItemIdTextsByGuid: {
          'live-1': expect.any(String),
        },
      })
    );
    expect(upsertAddByRSSFeedMock).not.toHaveBeenCalled();
    expect(releaseAddByRSSParseInFlightMock).toHaveBeenCalledWith(`listed:${ALBUM_URL}`);
  });

  it('leaves the listed album as it is and releases its key when the poll rejects', async () => {
    getAddByRSSParseStatusMock.mockRejectedValue(new Error('status failed'));

    await resumeListedAddByRSSPolls([listedAlbum()]);

    expect(upsertListedAddByRSSFeedMock).not.toHaveBeenCalled();
    expect(upsertAddByRSSFeedMock).not.toHaveBeenCalled();
    expect(releaseAddByRSSParseInFlightMock).toHaveBeenCalledWith(`listed:${ALBUM_URL}`);
  });

  it('skips listed albums that are settled or have no request to poll', async () => {
    await resumeListedAddByRSSPolls([
      listedAlbum({ status: 'parsed' }),
      listedAlbum({ publisherParseRequestId: null }),
    ]);

    expect(getAddByRSSParseStatusMock).not.toHaveBeenCalled();
  });

  describe('followAddByRSSChannelAndQueue', () => {
    beforeEach(() => {
      followAddByRSSChannelMock.mockResolvedValue({});
      enqueueAddByRSSParseMock.mockResolvedValue({ request_id: 'follow-request' });
    });

    it('keeps the listed album idText and parsed feed when following from it', async () => {
      const seed = parsedListedAlbum();

      const { record } = await followAddByRSSChannelAndQueue({
        accountId: 'account-1',
        feedUrl: ALBUM_URL,
        resourceType: 'albums',
        seedRecord: seed,
      });

      expect(record).toEqual(
        expect.objectContaining({
          id: seed.id,
          idText: seed.idText,
          mappedFeed: seed.mappedFeed,
          status: 'queued',
          resourceType: 'albums',
        })
      );
      expect(record).not.toHaveProperty('publisherParseRequestId');
      expect(record).not.toHaveProperty('itemIdTextsByGuid');
      expect(record).not.toHaveProperty('liveItemIdTextsByGuid');
      expect(upsertAddByRSSFeedMock).toHaveBeenCalledWith(record);
    });

    it('creates a new idText without a seed record', async () => {
      const { record } = await followAddByRSSChannelAndQueue({
        accountId: 'account-1',
        feedUrl: ALBUM_URL,
        resourceType: 'albums',
      });

      expect(record.idText).not.toBe('album-id');
      expect(record.mappedFeed).toBeUndefined();
      expect(upsertAddByRSSFeedMock).toHaveBeenCalledWith(record);
    });
  });
});
