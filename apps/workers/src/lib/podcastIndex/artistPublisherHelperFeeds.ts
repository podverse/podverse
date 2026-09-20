/**
 * Deterministic Podcast Index ids for music-artist (publisher-music) feeds.
 * Used by local-dev seeding when PI /podcasts/bymedium?medium=publisher is empty or sparse.
 * Verified as publisher feeds whose remoteItem mediums are mostly music.
 */
export const ARTIST_PUBLISHER_HELPER_FEEDS = [
  {
    podcastIndexId: 7458805,
    title: 'Middle Season',
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
] as const;
