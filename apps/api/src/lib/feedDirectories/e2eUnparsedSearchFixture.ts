import type { PodcastIndexSearchPodcastsResponse, SearchPodcastsFeed } from '@podverse/helpers';

/**
 * Fixtures-only sentinel for mobile Maestro `search-unparsed`.
 * Querying this term returns a synthetic Podcast Index feed whose `podcast_index_id`
 * is never seeded as a parsed-ready channel, so `GET /channel/podcast-index/:id`
 * returns `null` and the client must show the preview/add path (not a generic error).
 */
export const E2E_UNPARSED_SEARCH_QUERY = 'unparsedfixture';

/** Reserved PI id from PodcastIndex mock range (`TEST_PODCAST_INDEX_ID_MIN`). */
export const E2E_UNPARSED_PODCAST_INDEX_ID = 2147483640;

const EMPTY_FUNDING = { url: '', message: '' };

export const buildE2eUnparsedSearchFeed = (): SearchPodcastsFeed => {
  return {
    id: E2E_UNPARSED_PODCAST_INDEX_ID,
    title: 'E2E Unparsed Podcast Index Feed',
    url: 'https://example.invalid/e2e-unparsed-feed.rss',
    originalUrl: 'https://example.invalid/e2e-unparsed-feed.rss',
    link: '',
    description: 'Synthetic feed for mobile search not-parsed-ready smoke coverage.',
    author: 'E2E Fixture Author',
    ownerName: 'E2E Fixture Author',
    image: '',
    artwork: '',
    lastUpdateTime: 0,
    lastCrawlTime: 0,
    lastParseTime: 0,
    inPollingQueue: 0,
    priority: 0,
    lastGoodHttpStatusTime: 0,
    lastHttpStatus: 200,
    contentType: 'application/rss+xml',
    itunesId: 0,
    generator: '',
    language: 'en',
    type: 0,
    dead: 0,
    crawlErrors: 0,
    parseErrors: 0,
    categories: {},
    locked: 0,
    explicit: false,
    podcastGuid: `e2e-unparsed-${E2E_UNPARSED_PODCAST_INDEX_ID}`,
    medium: 'podcast',
    episodeCount: 0,
    imageUrlHash: 0,
    newestItemPubdate: 0,
    funding: EMPTY_FUNDING,
  };
};

export const buildE2eUnparsedSearchResponse = (
  query: string
): PodcastIndexSearchPodcastsResponse => {
  const feed = buildE2eUnparsedSearchFeed();
  return {
    status: 'true',
    feeds: [feed],
    count: 1,
    query,
    description: 'Found matching feeds.',
  };
};

export const isE2eUnparsedSearchQuery = (query: string): boolean => {
  return query.trim().toLowerCase() === E2E_UNPARSED_SEARCH_QUERY;
};
