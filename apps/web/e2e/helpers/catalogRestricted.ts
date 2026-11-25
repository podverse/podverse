import {
  E2E_BOOST_EPISODE_CHANNEL_ID_TEXT,
  E2E_BOOST_EPISODE_ITEM_ID_TEXT,
  E2E_LIVESTREAM_FEED_PI_ID,
  E2E_MUSIC_ARTIST_FEED_PI_ID,
  E2E_MUSIC_FEED_PI_ID,
  E2E_PODCAST_FEED_PI_ID,
  EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT,
} from './seedConstants';

/** Podcast Index ids on the catalog-restricted lane's allowlist. */
export const E2E_CATALOG_RESTRICTED_PODCAST_INDEX_IDS: readonly number[] = [
  E2E_PODCAST_FEED_PI_ID,
  E2E_LIVESTREAM_FEED_PI_ID,
  E2E_MUSIC_FEED_PI_ID,
  E2E_MUSIC_ARTIST_FEED_PI_ID,
];

/** A stored podcast off the allowlist, with episodes, a clip, an official clip, and chapters. */
export const E2E_CATALOG_OFF_LIST_PODCAST_CHANNEL_ID_TEXT = EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT;

/** A second stored podcast off the allowlist, with one episode. */
export const E2E_CATALOG_OFF_LIST_BOOST_CHANNEL_ID_TEXT = E2E_BOOST_EPISODE_CHANNEL_ID_TEXT;
export const E2E_CATALOG_OFF_LIST_BOOST_EPISODE_ID_TEXT = E2E_BOOST_EPISODE_ITEM_ID_TEXT;
