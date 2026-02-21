export const DEFAULT_ITEMS = 20;
export const DEFAULT_MULTI = 2;
export const ITEMS_PER_SEASON = 10;
export const MIN_SEASONS = 2;
export const METABOOST_URL = 'http://localhost:8080/boost';
export const METABOOST_LICENSE_URL = 'https://example.com/metaboost-license';
export const LNURL_TEST_ADDRESSES = [
  'podverse+one@sandbox.albylabs.com',
  'podverse+two@sandbox.albylabs.com',
  'podverse+fee@sandbox.albylabs.com',
];
export const VALUE_RECIPIENT_SPLITS = [60, 40, 1] as const;

/** Fixed ActivityPub socialInteract for all generated feeds (channel + every item). */
export const SOCIAL_INTERACT_URI = 'https://podcastindex.social/@mitch/116024949309724989';
export const SOCIAL_INTERACT_PROTOCOL = 'activitypub';
export const SOCIAL_INTERACT_ACCOUNT_ID = '@mitch';
export const SOCIAL_INTERACT_ACCOUNT_URL = 'https://podcastindex.social/@mitch';

export const MAX_FEEDS = 100_000;
export const MAX_ASSETS_PER_TYPE = 100;
export const MAX_JPEG_FILES = 100;

/** Widths (px) for podcast:images srcset. Total JPEGs = imagePoolSize * IMAGE_SIZES.length ≤ MAX_JPEG_FILES. */
export const IMAGE_SIZES = [300, 600, 1400];

/** Basic-Auth test feed: one feed, fixed 10 items, under assets/basic-auth/. */
export const BASIC_AUTH_FEED_ITEMS = 10;
export const BASIC_AUTH_FEED_FILENAME = 'feed-basic-auth.rss';
export const BASIC_AUTH_IMAGE_POOL_SIZE = 4;

/** Nine feed types per set: 5 non-season + 4 season. See 10-test-data-spec.md */
export const FEED_KINDS = [
  'none',
  'podcast',
  'video',
  'music',
  'publisher',
  'season',
  'podcast-season',
  'video-season',
  'music-season',
] as const;
export type FeedKind = (typeof FEED_KINDS)[number];

export const ITUNES_CATEGORIES = [
  'Technology',
  'Business',
  'News',
  'Comedy',
  'Education',
  'Science',
  'Society & Culture',
  'Arts',
  'Health',
  'Religion & Spirituality',
] as const;

/** Person role/group values Partytime accepts (from person-enum). */
export const PERSON_ROLES = ['Host', 'Co-Host', 'Guest', 'Producer', 'Narrator'] as const;
export const PERSON_GROUPS = ['Cast', 'Hosts', 'Creative Direction'] as const;

/** 07c: Reference enclosure for all live items (24/7 stream). */
export const LIVE_ITEM_ENCLOSURE_URL = 'https://op3.dev/e/listen.noagendastream.com/noagenda';
export const LIVE_ITEM_ENCLOSURE_TYPE = 'audio/mpeg';
export const LIVE_ITEM_ENCLOSURE_LENGTH = 33;

export const CHAPTERS_VERSION = '1.2.0';
export const MIN_CHAPTER_LENGTH_SEC = 10;
export const MIN_TOC_CHAPTERS = 3;
