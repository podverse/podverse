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
 * Channel and item IDs for the first feed (feed-podcast-1) after populate.
 * Lighthouse uses these so asset mapping aligns with feed-1-based assets.
 */
export const LIGHTHOUSE_CHANNEL_ID_FEED_1 = '1';
export const LIGHTHOUSE_ITEM_ID_FEED_1 = '1';
