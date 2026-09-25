/** Default base URL for the test-assets HTTP server (feeds and media). */
export const DEFAULT_ASSETS_BASE_URL = 'http://localhost:2111';

/** Default feed URL used by Lighthouse and generate_and_parse (one podcast feed). */
export const DEFAULT_TEST_FEED_URL = `${DEFAULT_ASSETS_BASE_URL}/feeds/feed-podcast-1.rss`;

/** Path segment and directory name for Basic-Auth-protected assets. */
export const BASIC_AUTH_SUBDIR = 'basic-auth';

/**
 * Basic-Auth-protected test feed (one feed, 10 items). For add-by-RSS testing.
 * Server requires HTTP Basic Auth for paths under /basic-auth/ (username: username, password: password).
 * See TOOLS-TEST-ASSETS.md.
 */
export const DEFAULT_BASIC_AUTH_FEED_URL = `${DEFAULT_ASSETS_BASE_URL}/${BASIC_AUTH_SUBDIR}/feeds/feed-basic-auth.rss`;

/** Base URL for basic-auth assets (feed, enclosures, images, chapters, transcripts). */
export const BASIC_AUTH_BASE_URL = `${DEFAULT_ASSETS_BASE_URL}/${BASIC_AUTH_SUBDIR}`;

/** HTTP Basic Auth credentials for /basic-auth/ paths (test only; do not use in production). */
export const BASIC_AUTH_TEST_USERNAME = 'username';
export const BASIC_AUTH_TEST_PASSWORD = 'password';

/**
 * Loopback base URL that is a different host from `localhost` as far as credential scope is
 * concerned (IP and `localhost` scope by exact host). The server must listen on IPv4 for it to
 * answer; start it with `BIND_ADDRESS=0.0.0.0` when `localhost` resolves to `::1` only.
 */
export const OTHER_HOST_ASSETS_BASE_URL = 'http://127.0.0.1:2111';

/** Unauthenticated mirror of `/basic-auth/` media (everything except `feeds/`). */
export const BASIC_AUTH_PUBLIC_MEDIA_SUBDIR = 'basic-auth-public-media';

/**
 * Feed variants built from `feed-basic-auth.rss` on each request. They sit under `/basic-auth/`,
 * so the feed itself is gated like the base feed; only their resource URLs differ.
 */
export const BASIC_AUTH_VARIANTS_SUBPATH = 'variants';

/** Feed gated, enclosures / images / chapters / transcripts on the public mirror. */
export const BASIC_AUTH_PUBLIC_MEDIA_FEED_URL = `${BASIC_AUTH_BASE_URL}/${BASIC_AUTH_VARIANTS_SUBPATH}/feed-public-media.rss`;

/** Feed gated on `localhost`; its resources gated on `127.0.0.1`, a host credentials must not reach. */
export const BASIC_AUTH_OTHER_HOST_MEDIA_FEED_URL = `${BASIC_AUTH_BASE_URL}/${BASIC_AUTH_VARIANTS_SUBPATH}/feed-other-host-media.rss`;

/**
 * `GET /redirect/other-host/<path>` answers 302 to `<path>` on the other loopback host
 * (`localhost` ↔ `127.0.0.1`, or `REDIRECT_OTHER_HOST` when set).
 */
export const REDIRECT_OTHER_HOST_PREFIX = 'redirect/other-host';

/** Reports whether the request carried an `Authorization` header. Never echoes its value. */
export const AUTHORIZATION_PROBE_PATH = 'debug/authorization';

/**
 * Channel and item IDs for the first feed (feed-podcast-1) after populate.
 * Lighthouse uses these so asset mapping aligns with feed-1-based assets.
 */
export const LIGHTHOUSE_CHANNEL_ID_FEED_1 = '1';
export const LIGHTHOUSE_ITEM_ID_FEED_1 = '1';
