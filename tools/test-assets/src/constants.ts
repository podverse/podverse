/** Default base URL for the test-assets HTTP server (feeds and media). */
export const DEFAULT_ASSETS_BASE_URL = 'http://localhost:2111';

/** Default feed URL used by Lighthouse and generate_and_parse (one podcast feed). */
export const DEFAULT_TEST_FEED_URL = `${DEFAULT_ASSETS_BASE_URL}/feeds/feed-podcast-1.rss`;

/**
 * Channel and item IDs for the first feed (feed-podcast-1) after populate.
 * Lighthouse uses these so asset mapping aligns with feed-1-based assets.
 */
export const LIGHTHOUSE_CHANNEL_ID_FEED_1 = '1';
export const LIGHTHOUSE_ITEM_ID_FEED_1 = '1';
