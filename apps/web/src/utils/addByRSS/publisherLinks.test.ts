import { describe, expect, it } from 'vitest';

import type { AddByRSSPublisherListedFeed } from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';
import type { FeedObject } from '@podverse/parser-mapping';
import { convertParsedRSSFeedToCompat, Phase4Medium } from '@podverse/parser-mapping';

import {
  addByRSSAlbumsNamingPublisher,
  addByRSSArtistPath,
  mergeAddByRSSAlbumSources,
  resolveAddByRSSAlbumArtists,
  resolveAddByRSSArtistAlbums,
  resolveAddByRSSArtistTrackRefs,
  resolveDirectoryAlbumAddByRSSArtists,
  withoutAddByRSSArtistLinks,
} from './publisherLinks';
import type {
  AddByRSSFeedRecord,
  AddByRSSListedFeedRecord,
  AddByRSSPublisherLinkRecord,
} from './types';

type PublisherInput = { feedGuid: string; feedUrl?: string; itemGuid?: string };

const phaseMedium = (mediumId: number): Phase4Medium => {
  if (mediumId === MediumEnum.Podcast) {
    return Phase4Medium.Podcast;
  }
  if (mediumId === MediumEnum.MusicL) {
    return Phase4Medium.MusicL;
  }
  return Phase4Medium.Music;
};

const albumRecord = (input: {
  idText: string;
  feedUrl: string;
  guid?: string | null;
  publisherGuids?: PublisherInput[];
  mediumId?: number;
  parsed?: boolean;
  items?: string[];
}): AddByRSSFeedRecord => {
  const parsed = input.parsed !== false;
  const feed: FeedObject = {
    title: input.idText,
    explicit: false,
    link: 'https://example.com',
    guid: input.guid,
    medium: phaseMedium(input.mediumId ?? MediumEnum.Music),
    items: (input.items ?? []).map((guid) => ({
      guid,
      title: guid,
      duration: 60,
      explicit: false,
      enclosure: { url: `https://example.com/${guid}.mp3`, length: 1, type: 'audio/mpeg' },
    })),
    podcastPublisher: (input.publisherGuids ?? []).map((publisher) => ({
      feedGuid: publisher.feedGuid,
      feedUrl: publisher.feedUrl,
      itemGuid: publisher.itemGuid,
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
    ...(parsed ? { mappedFeed: convertParsedRSSFeedToCompat(feed) } : {}),
  };
};

const listedRecord = (input: Parameters<typeof albumRecord>[0]): AddByRSSListedFeedRecord => ({
  ...albumRecord(input),
  publisherParseRequestId: null,
  itemIdTextsByGuid: {},
  liveItemIdTextsByGuid: {},
});

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

const addByRssListing = (input: {
  feedUrl: string | null;
  feedGuid: string;
  listedAtChannelLevel?: boolean;
  itemGuids?: string[];
}): AddByRSSPublisherListedFeed => ({
  kind: 'add_by_rss',
  feedGuid: input.feedGuid,
  feedUrl: input.feedUrl,
  title: null,
  listedAtChannelLevel: input.listedAtChannelLevel ?? true,
  itemGuids: input.itemGuids ?? [],
  requestId: 'request-1',
});

const directoryListing = (input: {
  channelIdText: string;
  feedGuid: string;
  mediumId: number | null;
  channelTitle?: string | null;
  title?: string | null;
  feedUrl?: string | null;
  listedAtChannelLevel?: boolean;
  itemGuids?: string[];
}): AddByRSSPublisherListedFeed => ({
  kind: 'directory',
  feedGuid: input.feedGuid,
  feedUrl: input.feedUrl ?? null,
  title: input.title ?? null,
  listedAtChannelLevel: input.listedAtChannelLevel ?? true,
  itemGuids: input.itemGuids ?? [],
  channelIdText: input.channelIdText,
  channelTitle: input.channelTitle ?? null,
  mediumId: input.mediumId,
});

describe('resolveAddByRSSArtistAlbums', () => {
  it('lists a channel-level Add by RSS album, then the directory album it lists', () => {
    const artist = albumRecord({
      idText: 'artist',
      feedUrl: 'https://artist.example/feed.xml',
      guid: 'artist-guid',
      mediumId: MediumEnum.Podcast,
    });
    const albumA = albumRecord({
      idText: 'album-a',
      feedUrl: 'https://a.example/feed.xml',
      guid: 'album-a-guid',
      parsed: false,
    });
    const sources = mergeAddByRSSAlbumSources([albumA], []);

    const entries = resolveAddByRSSArtistAlbums({
      artist,
      link: link({
        publisherIdText: 'artist',
        publisherGuid: 'artist-guid',
        listedFeeds: [
          addByRssListing({ feedUrl: albumA.feedUrl, feedGuid: 'album-a-guid' }),
          directoryListing({
            channelIdText: 'dir-d',
            feedGuid: 'dir-d-guid',
            mediumId: null,
            channelTitle: 'Directory D',
          }),
        ],
      }),
      sources,
    });

    expect(entries).toEqual([
      { kind: 'add_by_rss', source: { followed: true, feed: albumA } },
      {
        kind: 'directory',
        channelIdText: 'dir-d',
        title: 'Directory D',
        feedGuid: 'dir-d-guid',
      },
    ]);
  });

  it('keeps the followed record when a listed record canonicalizes to the same URL', () => {
    const followed = albumRecord({
      idText: 'followed-album',
      feedUrl: 'http://Album.Example.com/a.xml',
    });
    const listedSame = listedRecord({
      idText: 'listed-same',
      feedUrl: 'http://user:pass@album.example.com/a.xml',
    });
    const listedHttps = listedRecord({
      idText: 'listed-https',
      feedUrl: 'https://album.example.com/a.xml',
    });

    const merged = mergeAddByRSSAlbumSources([followed], [listedHttps, listedSame]);

    expect(merged.map((source) => source.feed.idText)).toEqual(['followed-album', 'listed-https']);
    expect(merged[0]).toEqual({ followed: true, feed: followed });
  });

  it('appends an album that names the artist guid when the artist does not list it', () => {
    const artist = albumRecord({
      idText: 'artist',
      feedUrl: 'https://artist.example/feed.xml',
      guid: 'artist-guid',
      mediumId: MediumEnum.Podcast,
    });
    const albumA = albumRecord({
      idText: 'album-a',
      feedUrl: 'https://a.example/feed.xml',
      guid: 'album-a-guid',
      publisherGuids: [{ feedGuid: 'ARTIST-GUID' }],
    });
    const albumB = albumRecord({
      idText: 'album-b',
      feedUrl: 'https://b.example/feed.xml',
      guid: 'album-b-guid',
      publisherGuids: [{ feedGuid: 'ARTIST-GUID', feedUrl: 'https://artist.example/feed.xml' }],
    });
    const sources = mergeAddByRSSAlbumSources([albumA, albumB], []);

    const entries = resolveAddByRSSArtistAlbums({
      artist,
      link: link({
        publisherIdText: 'artist',
        publisherGuid: 'artist-guid',
        listedFeeds: [addByRssListing({ feedUrl: albumA.feedUrl, feedGuid: 'album-a-guid' })],
      }),
      sources,
    });

    expect(
      entries.map((entry) => (entry.kind === 'add_by_rss' ? entry.source.feed.idText : ''))
    ).toEqual(['album-a', 'album-b']);
  });

  it('resolves an album for each artist that lists it', () => {
    const album = albumRecord({
      idText: 'album-a',
      feedUrl: 'https://a.example/feed.xml',
      guid: 'album-a-guid',
    });
    const sources = mergeAddByRSSAlbumSources([album], []);
    const row = addByRssListing({ feedUrl: album.feedUrl, feedGuid: 'album-a-guid' });
    const artist1 = albumRecord({
      idText: 'artist-1',
      feedUrl: 'https://artist-1.example/feed.xml',
      guid: 'artist-1-guid',
      mediumId: MediumEnum.Podcast,
    });
    const artist2 = albumRecord({
      idText: 'artist-2',
      feedUrl: 'https://artist-2.example/feed.xml',
      guid: 'artist-2-guid',
      mediumId: MediumEnum.Podcast,
    });

    for (const artist of [artist1, artist2]) {
      const entries = resolveAddByRSSArtistAlbums({
        artist,
        link: link({ publisherIdText: artist.idText, listedFeeds: [row] }),
        sources,
      });
      expect(entries).toEqual([{ kind: 'add_by_rss', source: { followed: true, feed: album } }]);
    }
  });

  it('leaves out a podcast-medium directory row and an unresolved row', () => {
    const artist = albumRecord({
      idText: 'artist',
      feedUrl: 'https://artist.example/feed.xml',
      guid: 'artist-guid',
      mediumId: MediumEnum.Podcast,
    });
    const album = albumRecord({
      idText: 'album-a',
      feedUrl: 'https://a.example/feed.xml',
      guid: 'album-a-guid',
    });

    const entries = resolveAddByRSSArtistAlbums({
      artist,
      link: link({
        publisherIdText: 'artist',
        listedFeeds: [
          directoryListing({
            channelIdText: 'show',
            feedGuid: 'show-guid',
            mediumId: MediumEnum.Podcast,
            channelTitle: 'Show',
          }),
          {
            kind: 'unresolved',
            feedGuid: 'album-a-guid',
            feedUrl: album.feedUrl,
            title: null,
            listedAtChannelLevel: true,
            itemGuids: [],
            reason: 'no_feed_url',
          },
        ],
      }),
      sources: mergeAddByRSSAlbumSources([album], []),
    });

    expect(entries).toEqual([]);
  });
});

describe('resolveAddByRSSArtistTrackRefs', () => {
  it('includes every track of a channel-level album and only the credited tracks of an item-level album', () => {
    const artist = albumRecord({
      idText: 'artist',
      feedUrl: 'https://artist.example/feed.xml',
      guid: 'artist-guid',
      mediumId: MediumEnum.Podcast,
    });
    const albumA = albumRecord({
      idText: 'album-a',
      feedUrl: 'https://a.example/feed.xml',
      guid: 'album-a-guid',
    });
    const albumC = listedRecord({
      idText: 'album-c',
      feedUrl: 'https://c.example/feed.xml',
      guid: 'album-c-guid',
    });
    const directoryAlbum = listedRecord({
      idText: 'directory-copy',
      feedUrl: 'https://dir.example/feed.xml',
      guid: 'dir-guid',
    });
    const sources = mergeAddByRSSAlbumSources([albumA], [albumC, directoryAlbum]);
    const publisherLink = link({
      publisherIdText: 'artist',
      listedFeeds: [
        addByRssListing({
          feedUrl: albumA.feedUrl,
          feedGuid: 'album-a-guid',
          itemGuids: ['should-not-narrow'],
        }),
        addByRssListing({
          feedUrl: albumC.feedUrl,
          feedGuid: 'album-c-guid',
          listedAtChannelLevel: false,
          itemGuids: [' Track-C ', 'track-c'],
        }),
        directoryListing({
          channelIdText: 'dir-album',
          feedGuid: 'dir-guid',
          feedUrl: directoryAlbum.feedUrl,
          mediumId: MediumEnum.Music,
          listedAtChannelLevel: false,
          itemGuids: ['dir-track'],
        }),
        addByRssListing({
          feedUrl: 'https://missing.example/feed.xml',
          feedGuid: 'missing-guid',
          listedAtChannelLevel: false,
          itemGuids: ['missing-track'],
        }),
      ],
    });
    const albums = resolveAddByRSSArtistAlbums({ artist, link: publisherLink, sources });

    const refs = resolveAddByRSSArtistTrackRefs({ link: publisherLink, albums, sources });

    expect(refs.map((ref) => ref.source.feed.idText)).toEqual(['album-a', 'album-c']);
    expect(refs[0]?.itemGuids).toBeNull();
    expect(refs[1]?.itemGuids).toEqual(new Set(['Track-C', 'track-c']));
  });
});

describe('addByRSSAlbumsNamingPublisher', () => {
  it('keeps only album-medium records that name the guid', () => {
    const naming = albumRecord({
      idText: 'naming',
      feedUrl: 'https://naming.example/feed.xml',
      publisherGuids: [{ feedGuid: 'ARTIST-GUID' }],
    });
    const other = albumRecord({
      idText: 'other',
      feedUrl: 'https://other.example/feed.xml',
      publisherGuids: [{ feedGuid: 'someone-else' }],
    });
    const podcast = albumRecord({
      idText: 'podcast',
      feedUrl: 'https://podcast.example/feed.xml',
      mediumId: MediumEnum.Podcast,
      publisherGuids: [{ feedGuid: 'artist-guid' }],
    });
    const sources = mergeAddByRSSAlbumSources([naming, other, podcast], []);

    expect(
      addByRSSAlbumsNamingPublisher(sources, 'artist-guid').map((source) => source.feed.idText)
    ).toEqual(['naming']);
    expect(addByRSSAlbumsNamingPublisher(sources, null)).toEqual([]);
  });
});

describe('resolveAddByRSSAlbumArtists', () => {
  it('names stored artists in pointer order, then looks up a pointer with none stored', () => {
    const albumUrl = 'https://album.example/feed.xml';
    const album = albumRecord({
      idText: 'album',
      feedUrl: albumUrl,
      guid: 'album-guid',
      publisherGuids: [
        { feedGuid: 'NAMED-GUID', feedUrl: 'https://named.example/feed.xml', itemGuid: 'item-1' },
        { feedGuid: 'named-guid', feedUrl: 'https://second.example/feed.xml', itemGuid: 'item-2' },
      ],
    });
    const listing = link({
      publisherIdText: 'listing-artist',
      publisherTitle: 'Listing Artist',
      publisherGuid: 'listing-guid',
      publisherFeedUrl: 'https://listing.example/feed.xml',
      listedFeeds: [addByRssListing({ feedUrl: null, feedGuid: 'ALBUM-GUID' })],
    });
    const named = link({
      publisherIdText: 'named-artist',
      publisherTitle: 'Named Artist',
      publisherGuid: 'NAMED-GUID',
      publisherFeedUrl: 'https://named.example/feed.xml',
      listedFeeds: [addByRssListing({ feedUrl: albumUrl, feedGuid: 'album-guid' })],
    });
    const blank = link({
      publisherIdText: 'blank',
      publisherTitle: ' ',
      publisherGuid: 'blank-guid',
      listedFeeds: [addByRssListing({ feedUrl: albumUrl, feedGuid: 'album-guid' })],
    });

    expect(resolveAddByRSSAlbumArtists({ album, links: [listing, named, blank] })).toEqual({
      kind: 'add_by_rss',
      links: [
        {
          idText: 'named-artist',
          title: 'Named Artist',
          href: '/add-by-rss/artist/named-artist',
        },
        {
          idText: 'listing-artist',
          title: 'Listing Artist',
          href: '/add-by-rss/artist/listing-artist',
        },
      ],
    });

    const unstored = albumRecord({
      idText: 'unstored',
      feedUrl: 'https://unstored.example/feed.xml',
      guid: 'unstored-guid',
      publisherGuids: [
        {
          feedGuid: 'DIR-ARTIST',
          feedUrl: 'https://dir-artist.example/feed.xml',
          itemGuid: 'item-1',
        },
        {
          feedGuid: 'dir-artist',
          feedUrl: 'https://second.example/feed.xml',
          itemGuid: 'item-2',
        },
      ],
    });
    expect(resolveAddByRSSAlbumArtists({ album: unstored, links: [] })).toEqual({
      kind: 'directory_lookup',
      refs: [{ feedGuid: 'dir-artist', feedUrl: 'https://dir-artist.example/feed.xml' }],
    });

    const plain = albumRecord({
      idText: 'plain',
      feedUrl: 'https://plain.example/feed.xml',
      guid: 'plain-guid',
    });
    expect(resolveAddByRSSAlbumArtists({ album: plain, links: [] })).toEqual({ kind: 'none' });

    const podcast = albumRecord({
      idText: 'podcast',
      feedUrl: 'https://podcast.example/feed.xml',
      guid: 'podcast-guid',
      mediumId: MediumEnum.Podcast,
      publisherGuids: [{ feedGuid: 'someone', feedUrl: 'https://someone.example/feed.xml' }],
    });
    expect(
      resolveAddByRSSAlbumArtists({
        album: podcast,
        links: [
          link({
            publisherIdText: 'lister',
            listedFeeds: [addByRssListing({ feedUrl: podcast.feedUrl, feedGuid: 'podcast-guid' })],
          }),
        ],
      })
    ).toEqual({ kind: 'none' });
  });
});

describe('resolveDirectoryAlbumAddByRSSArtists', () => {
  it('matches a directory album by channel id and by guid', () => {
    const byChannel = link({
      publisherIdText: 'by-channel',
      publisherTitle: 'By Channel',
      listedFeeds: [
        directoryListing({
          channelIdText: 'dir-1',
          feedGuid: 'other-guid',
          mediumId: null,
          channelTitle: 'Directory',
        }),
      ],
    });
    const byGuid = link({
      publisherIdText: 'by-guid',
      publisherTitle: 'By Guid',
      listedFeeds: [
        addByRssListing({ feedUrl: 'https://dir.example/feed.xml', feedGuid: 'DIR-GUID' }),
      ],
    });
    const blank = link({
      publisherIdText: 'blank',
      publisherTitle: ' ',
      listedFeeds: [addByRssListing({ feedUrl: null, feedGuid: 'dir-guid' })],
    });
    const neither = link({
      publisherIdText: 'neither',
      publisherTitle: 'Neither',
      listedFeeds: [
        directoryListing({
          channelIdText: 'other',
          feedGuid: 'unrelated',
          mediumId: MediumEnum.Music,
        }),
      ],
    });
    const links = [byChannel, byGuid, blank, neither];

    expect(
      resolveDirectoryAlbumAddByRSSArtists({
        channelIdText: 'dir-1',
        podcastGuid: null,
        links,
      })
    ).toEqual([
      {
        idText: 'by-channel',
        title: 'By Channel',
        href: '/add-by-rss/artist/by-channel',
      },
    ]);
    expect(
      resolveDirectoryAlbumAddByRSSArtists({
        channelIdText: 'missing',
        podcastGuid: 'dir-guid',
        links,
      })
    ).toEqual([
      {
        idText: 'by-guid',
        title: 'By Guid',
        href: '/add-by-rss/artist/by-guid',
      },
    ]);
  });
});

describe('withoutAddByRSSArtistLinks', () => {
  it('drops an Add by RSS artist link and keeps a directory artist link in input order', () => {
    const directory = { idText: 'abc', title: 'Directory', href: '/artist/abc' };
    const addByRss = { idText: 'rss', title: 'Saved artist', href: addByRSSArtistPath('abc') };
    const laterDirectory = { idText: 'def', title: 'Later directory', href: '/artist/def' };

    expect(withoutAddByRSSArtistLinks([directory, addByRss, laterDirectory])).toEqual([
      directory,
      laterDirectory,
    ]);
  });

  it('returns an empty array when every link is an Add by RSS artist link', () => {
    expect(
      withoutAddByRSSArtistLinks([
        { idText: 'abc', title: 'One', href: addByRSSArtistPath('abc') },
        { idText: 'def', title: 'Two', href: addByRSSArtistPath('def') },
      ])
    ).toEqual([]);
  });
});
