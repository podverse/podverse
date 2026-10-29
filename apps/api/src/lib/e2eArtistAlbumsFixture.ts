import type { PodcastByIdFeed, PodcastIndexPodcastByIdResponse } from '@podverse/helpers';

/** Backs the Podcast Index preview for the seeded artist album whose list row comes from a stub. */
export const E2E_ARTIST_NOT_YET_ADDED_ALBUM_PODCAST_GUID = '11111111-2222-4333-8444-555555555504';

/**
 * Below Podcast Index's mock id range (`TEST_PODCAST_INDEX_ID_MIN` = 2147483640) so fixtures
 * mode and that mock never share an id.
 */
export const E2E_ARTIST_NOT_YET_ADDED_ALBUM_PODCAST_INDEX_ID = 2147483631;

export const E2E_ARTIST_NOT_YET_ADDED_ALBUM_FEED_URL =
  'https://e2e-seed-music.example/album-not-yet-added.xml';

export const E2E_ARTIST_NOT_YET_ADDED_ALBUM_TITLE = 'E2E Not Yet Added Album';

/** Podcast Index preview for the web podroll stub show. */
export const E2E_PODROLL_STUB_PODCAST_INDEX_ID = 2147483630;

export const E2E_PODROLL_STUB_FEED_GUID = '11111111-2222-4333-8444-555555555511';

export const E2E_PODROLL_STUB_FEED_URL = 'https://e2e-seed-remote-items.example/podroll-stub.xml';

export const E2E_PODROLL_STUB_TITLE = 'E2E Podroll Stub Show';

/** Podcast Index preview for the web channel remote-item stub show. */
export const E2E_CHANNEL_REMOTE_STUB_PODCAST_INDEX_ID = 2147483629;

export const E2E_CHANNEL_REMOTE_STUB_FEED_GUID = '11111111-2222-4333-8444-555555555512';

export const E2E_CHANNEL_REMOTE_STUB_FEED_URL =
  'https://e2e-seed-remote-items.example/remote-stub.xml';

export const E2E_CHANNEL_REMOTE_STUB_TITLE = 'E2E Remote Stub Show';

export const E2E_CHANNEL_REMOTE_STUB_AUTHOR = 'E2E Remote Stub Author';

/** Same device-reachable artwork URL as `buildE2eUnparsedSearchFeed`. */
const E2E_ARTIST_NOT_YET_ADDED_ALBUM_IMAGE_URL =
  'http://localhost:2111/e2e/images/e2e-embed-channel-art-1400.png';

type E2ePreviewFeedFields = {
  id: number;
  podcastGuid: string;
  medium: string;
  title: string;
  url: string;
  author: string;
};

const buildE2ePodcastIndexByIdResponse = (
  fields: E2ePreviewFeedFields
): PodcastIndexPodcastByIdResponse => {
  const feed: PodcastByIdFeed = {
    id: fields.id,
    podcastGuid: fields.podcastGuid,
    medium: fields.medium,
    title: fields.title,
    url: fields.url,
    originalUrl: fields.url,
    link: '',
    description: '',
    author: fields.author,
    ownerName: fields.author,
    image: E2E_ARTIST_NOT_YET_ADDED_ALBUM_IMAGE_URL,
    artwork: E2E_ARTIST_NOT_YET_ADDED_ALBUM_IMAGE_URL,
    lastUpdateTime: 0,
    lastCrawlTime: 0,
    lastParseTime: 0,
    lastGoodHttpStatusTime: 0,
    lastHttpStatus: 0,
    contentType: '',
    itunesId: 0,
    itunesType: '',
    generator: '',
    language: '',
    explicit: false,
    type: 0,
    dead: 0,
    chash: '',
    episodeCount: 0,
    crawlErrors: 0,
    parseErrors: 0,
    categories: {},
    locked: 0,
    imageUrlHash: 0,
  };
  return {
    status: 'true',
    query: { id: String(feed.id) },
    feed,
    description: 'Found matching feeds.',
  };
};

export const buildE2eArtistNotYetAddedAlbumByIdResponse = (): PodcastIndexPodcastByIdResponse => {
  return buildE2ePodcastIndexByIdResponse({
    id: E2E_ARTIST_NOT_YET_ADDED_ALBUM_PODCAST_INDEX_ID,
    podcastGuid: E2E_ARTIST_NOT_YET_ADDED_ALBUM_PODCAST_GUID,
    medium: 'music',
    title: E2E_ARTIST_NOT_YET_ADDED_ALBUM_TITLE,
    url: E2E_ARTIST_NOT_YET_ADDED_ALBUM_FEED_URL,
    author: 'E2E Music Artist',
  });
};

export function buildE2eRemoteStubPreviewByIdResponse(
  podcastIndexId: number
): PodcastIndexPodcastByIdResponse | null {
  if (podcastIndexId === E2E_ARTIST_NOT_YET_ADDED_ALBUM_PODCAST_INDEX_ID) {
    return buildE2eArtistNotYetAddedAlbumByIdResponse();
  }

  if (podcastIndexId === E2E_PODROLL_STUB_PODCAST_INDEX_ID) {
    return buildE2ePodcastIndexByIdResponse({
      id: E2E_PODROLL_STUB_PODCAST_INDEX_ID,
      podcastGuid: E2E_PODROLL_STUB_FEED_GUID,
      medium: 'podcast',
      title: E2E_PODROLL_STUB_TITLE,
      url: E2E_PODROLL_STUB_FEED_URL,
      author: '',
    });
  }

  if (podcastIndexId === E2E_CHANNEL_REMOTE_STUB_PODCAST_INDEX_ID) {
    return buildE2ePodcastIndexByIdResponse({
      id: E2E_CHANNEL_REMOTE_STUB_PODCAST_INDEX_ID,
      podcastGuid: E2E_CHANNEL_REMOTE_STUB_FEED_GUID,
      medium: 'podcast',
      title: E2E_CHANNEL_REMOTE_STUB_TITLE,
      url: E2E_CHANNEL_REMOTE_STUB_FEED_URL,
      author: E2E_CHANNEL_REMOTE_STUB_AUTHOR,
    });
  }

  return null;
}
