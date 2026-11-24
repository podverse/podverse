import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getAddByRSSAlbumSourceByIdTextMock,
  getAddByRSSAlbumSourceByUrlMock,
  getAllAddByRSSPublisherLinksMock,
  reqChannelGetDirectoryMatchMock,
} = vi.hoisted(() => ({
  getAddByRSSAlbumSourceByIdTextMock: vi.fn(),
  getAddByRSSAlbumSourceByUrlMock: vi.fn(),
  getAllAddByRSSPublisherLinksMock: vi.fn(),
  reqChannelGetDirectoryMatchMock: vi.fn(),
}));

vi.mock('./storage', () => ({
  getAddByRSSAlbumSourceByIdText: getAddByRSSAlbumSourceByIdTextMock,
  getAddByRSSAlbumSourceByUrl: getAddByRSSAlbumSourceByUrlMock,
  getAllAddByRSSPublisherLinks: getAllAddByRSSPublisherLinksMock,
}));

vi.mock('../../factories/apiRequestService', () => ({
  getApiRequestService: () => ({
    reqChannelGetDirectoryMatch: reqChannelGetDirectoryMatchMock,
  }),
}));

import type { AddByRSSPublisherListedFeed, DTOChannel } from '@podverse/helpers';
import { buildArtistPath, MediumEnum } from '@podverse/helpers';
import type { FeedObject } from '@podverse/parser-mapping';
import { convertParsedRSSFeedToCompat, Phase4Medium } from '@podverse/parser-mapping';

import { resolveDeviceArtistLinks } from './deviceArtistLinks';
import type { AddByRSSFeedRecord, AddByRSSPublisherLinkRecord } from './types';

const albumRecord = (input: {
  idText: string;
  feedUrl: string;
  guid?: string | null;
  publisherGuids?: { feedGuid: string; feedUrl?: string }[];
}): AddByRSSFeedRecord => {
  const feed: FeedObject = {
    title: input.idText,
    explicit: false,
    link: 'https://example.com',
    guid: input.guid,
    medium: Phase4Medium.Music,
    items: [],
    podcastPublisher: (input.publisherGuids ?? []).map((publisher) => ({
      feedGuid: publisher.feedGuid,
      feedUrl: publisher.feedUrl,
    })),
  };
  return {
    id: 1,
    idText: input.idText,
    resourceType: 'albums',
    feedUrl: input.feedUrl,
    title: input.idText,
    imageUrl: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
    mappedFeed: convertParsedRSSFeedToCompat(feed),
  };
};

const link = (input: {
  publisherIdText: string;
  publisherTitle?: string;
  publisherFeedUrl?: string;
  publisherGuid?: string | null;
  listedFeeds?: AddByRSSPublisherListedFeed[];
}): AddByRSSPublisherLinkRecord => ({
  publisherFeedUrl:
    input.publisherFeedUrl ?? `https://artists.example/${input.publisherIdText}.xml`,
  publisherIdText: input.publisherIdText,
  publisherTitle: input.publisherTitle ?? input.publisherIdText,
  publisherGuid: input.publisherGuid ?? null,
  listedFeeds: input.listedFeeds ?? [],
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const albumChannel = (verified: DTOChannel['verified_publishers']): DTOChannel => ({
  id: 1,
  id_text: 'dir-album',
  slug: null,
  feed_id: 1,
  podcast_guid: 'dir-album-guid',
  title: 'Directory Album',
  sortable_title: 'directory album',
  medium_id: MediumEnum.Music,
  has_value_time_splits: false,
  ...(verified === undefined ? {} : { verified_publishers: verified }),
});

describe('resolveDeviceArtistLinks', () => {
  beforeEach(() => {
    getAllAddByRSSPublisherLinksMock.mockReset();
    getAddByRSSAlbumSourceByUrlMock.mockReset();
    getAddByRSSAlbumSourceByIdTextMock.mockReset();
    reqChannelGetDirectoryMatchMock.mockReset();
    getAllAddByRSSPublisherLinksMock.mockResolvedValue([]);
    getAddByRSSAlbumSourceByUrlMock.mockResolvedValue(null);
    getAddByRSSAlbumSourceByIdTextMock.mockResolvedValue(null);
    reqChannelGetDirectoryMatchMock.mockResolvedValue(null);
  });

  it('links an Add by RSS album to the stored artist that names it without calling the API', async () => {
    const album = albumRecord({
      idText: 'album',
      feedUrl: 'https://album.example/feed.xml',
      guid: 'album-guid',
      publisherGuids: [{ feedGuid: 'named-guid', feedUrl: 'https://named.example/feed.xml' }],
    });
    getAddByRSSAlbumSourceByUrlMock.mockResolvedValue({ followed: true, feed: album });
    getAllAddByRSSPublisherLinksMock.mockResolvedValue([
      link({
        publisherIdText: 'named-artist',
        publisherTitle: 'Named Artist',
        publisherGuid: 'named-guid',
        publisherFeedUrl: 'https://named.example/feed.xml',
      }),
    ]);

    await expect(
      resolveDeviceArtistLinks({
        addByRSS: { feedUrl: album.feedUrl, channelIdText: null },
        channel: null,
        item: null,
      })
    ).resolves.toEqual([
      {
        idText: 'named-artist',
        title: 'Named Artist',
        href: '/add-by-rss/artist/named-artist',
      },
    ]);
    expect(reqChannelGetDirectoryMatchMock).not.toHaveBeenCalled();
  });

  it('looks up a directory artist once when the album names one that is not stored', async () => {
    const album = albumRecord({
      idText: 'unstored',
      feedUrl: 'https://unstored.example/feed.xml',
      guid: 'unstored-guid',
      publisherGuids: [{ feedGuid: 'DIR-ARTIST', feedUrl: 'https://dir-artist.example/feed.xml' }],
    });
    getAddByRSSAlbumSourceByUrlMock.mockResolvedValue({ followed: false, feed: album });
    reqChannelGetDirectoryMatchMock.mockResolvedValue({
      id_text: 'dirArtist1',
      title: ' Directory Artist ',
      medium_id: MediumEnum.PublisherMusic,
    });
    const input = {
      addByRSS: { feedUrl: album.feedUrl, channelIdText: null },
      channel: null,
      item: null,
    };

    const expected = [
      {
        idText: 'dirArtist1',
        title: 'Directory Artist',
        href: buildArtistPath('dirArtist1'),
      },
    ];
    await expect(resolveDeviceArtistLinks(input)).resolves.toEqual(expected);
    await expect(resolveDeviceArtistLinks(input)).resolves.toEqual(expected);
    expect(reqChannelGetDirectoryMatchMock).toHaveBeenCalledTimes(1);
    expect(reqChannelGetDirectoryMatchMock).toHaveBeenCalledWith({
      feed_guid: 'dir-artist',
      feed_url: 'https://dir-artist.example/feed.xml',
    });
  });

  it('returns no links when the directory lookup is not an artist or finds nothing', async () => {
    const nonArtist = albumRecord({
      idText: 'non-artist',
      feedUrl: 'https://non-artist.example/feed.xml',
      guid: 'non-artist-guid',
      publisherGuids: [
        { feedGuid: 'album-medium', feedUrl: 'https://album-medium.example/feed.xml' },
      ],
    });
    const missing = albumRecord({
      idText: 'missing',
      feedUrl: 'https://missing.example/feed.xml',
      guid: 'missing-guid',
      publisherGuids: [
        { feedGuid: 'missing-artist', feedUrl: 'https://missing.example/artist.xml' },
      ],
    });
    getAddByRSSAlbumSourceByUrlMock.mockImplementation(async (feedUrl: string) => {
      if (feedUrl === nonArtist.feedUrl) {
        return { followed: true, feed: nonArtist };
      }
      if (feedUrl === missing.feedUrl) {
        return { followed: true, feed: missing };
      }
      return null;
    });
    reqChannelGetDirectoryMatchMock.mockImplementation(async (params: { feed_guid: string }) => {
      if (params.feed_guid === 'album-medium') {
        return {
          id_text: 'someAlbum',
          title: 'Some Album',
          medium_id: MediumEnum.Music,
        };
      }
      return null;
    });

    await expect(
      resolveDeviceArtistLinks({
        addByRSS: { feedUrl: nonArtist.feedUrl, channelIdText: null },
        channel: null,
        item: null,
      })
    ).resolves.toEqual([]);
    await expect(
      resolveDeviceArtistLinks({
        addByRSS: { feedUrl: missing.feedUrl, channelIdText: null },
        channel: null,
        item: null,
      })
    ).resolves.toEqual([]);
  });

  it('links a directory album with no verified artist to the Add by RSS artist that lists it', async () => {
    getAllAddByRSSPublisherLinksMock.mockResolvedValue([
      link({
        publisherIdText: 'lister',
        publisherTitle: 'Lister',
        listedFeeds: [
          {
            kind: 'directory',
            feedGuid: 'dir-album-guid',
            feedUrl: null,
            title: null,
            listedAtChannelLevel: true,
            itemGuids: [],
            channelIdText: 'dir-album',
            channelTitle: 'Directory Album',
            mediumId: MediumEnum.Music,
          },
        ],
      }),
    ]);

    await expect(
      resolveDeviceArtistLinks({
        addByRSS: null,
        channel: albumChannel(undefined),
        item: null,
      })
    ).resolves.toEqual([
      {
        idText: 'lister',
        title: 'Lister',
        href: '/add-by-rss/artist/lister',
      },
    ]);

    await expect(
      resolveDeviceArtistLinks({
        addByRSS: null,
        channel: albumChannel([
          { id_text: 'ada', title: 'Ada', medium_id: MediumEnum.PublisherMusic },
        ]),
        item: null,
      })
    ).resolves.toEqual([]);
  });
});
