/**
 * Deterministic Podcast Index ids for music-artist (publisher-music) feeds.
 * Used by local-dev seeding (`devParserRSSParseArtistPublisherFeeds`).
 * Refresh with `devDiscoverArtistPublisherFeeds` (maintainer-only) and commit the diff.
 *
 * PI does not expose a dedicated artist endpoint; this list is whatever verified
 * publisher-music feeds discovery can find in the index (often far fewer than 50).
 */
export type ArtistPublisherFeedDef = {
  podcastIndexId: number;
  title: string;
};

export const ARTIST_PUBLISHER_FEEDS: readonly ArtistPublisherFeedDef[] = [
  {
    podcastIndexId: 7458805,
    title: 'Middle Season',
  },
  {
    podcastIndexId: 7661364,
    title: 'Test music feed',
  },
  {
    podcastIndexId: 7674616,
    title: 'Mans1',
  },
  {
    podcastIndexId: 7794185,
    title: 'Henrik Flyman',
  },
  {
    podcastIndexId: 7808605,
    title: 'Right Said Fred',
  },
  {
    podcastIndexId: 7917189,
    title: 'Haleen',
  },
  {
    podcastIndexId: 8007789,
    title: 'Wattsy Music',
  },
  {
    podcastIndexId: 8014427,
    title: 'Music Releases',
  },
];
