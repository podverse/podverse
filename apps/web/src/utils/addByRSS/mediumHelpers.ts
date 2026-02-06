import { MediumEnum } from '@podverse/helpers';

/**
 * Medium helpers for Add by RSS functionality.
 *
 * RSS Channel Mediums:
 * - Podcast/Video: Episodes
 * - Music/MusicL: Albums (tracks are items within)
 * - PublisherMusic: Artists
 * - PublisherPodcast/PublisherVideo: Podcast publishers
 */

// Podcast mediums (for episodes)
const PODCAST_MEDIUMS = new Set([
  MediumEnum.Podcast,
  MediumEnum.PodcastL,
  MediumEnum.Video,
  MediumEnum.VideoL,
  MediumEnum.PublisherPodcast,
  MediumEnum.PublisherVideo,
  MediumEnum.PublisherAV,
]);

// Music mediums (for tracks/albums)
const MUSIC_MEDIUMS = new Set([MediumEnum.Music, MediumEnum.MusicL]);

// Artist mediums
const ARTIST_MEDIUMS = new Set([MediumEnum.PublisherMusic]);

/**
 * Check if medium is podcast-type (channel contains episodes).
 * null/undefined defaults to podcast for backwards compatibility.
 */
export const isPodcastMediumId = (mediumId: number | null | undefined): boolean =>
  mediumId === null || mediumId === undefined || PODCAST_MEDIUMS.has(mediumId);

/**
 * Check if medium is music-type (channel contains tracks).
 * Includes Music, MusicL, and PublisherMusic.
 */
export const isMusicMediumId = (mediumId: number | null | undefined): boolean =>
  mediumId !== null &&
  mediumId !== undefined &&
  (MUSIC_MEDIUMS.has(mediumId) || ARTIST_MEDIUMS.has(mediumId));

/**
 * Check if medium is album-type (Music/MusicL specifically).
 */
export const isAlbumMediumId = (mediumId: number | null | undefined): boolean =>
  mediumId !== null && mediumId !== undefined && MUSIC_MEDIUMS.has(mediumId);

/**
 * Check if medium is artist-type (PublisherMusic).
 */
export const isArtistMediumId = (mediumId: number | null | undefined): boolean =>
  mediumId !== null && mediumId !== undefined && ARTIST_MEDIUMS.has(mediumId);

export type MediumFilter = 'podcast' | 'music' | 'all';

/**
 * Check if medium matches a filter category.
 */
export const matchesMediumFilter = (
  mediumId: number | null | undefined,
  filter: MediumFilter
): boolean => {
  if (filter === 'all') return true;
  if (filter === 'podcast') return isPodcastMediumId(mediumId);
  if (filter === 'music') return isMusicMediumId(mediumId);
  return false;
};

/**
 * Get the item type (episode/track) based on channel medium.
 */
export const getItemTypeFromMedium = (mediumId: number | null | undefined): 'episode' | 'track' => {
  return isMusicMediumId(mediumId) ? 'track' : 'episode';
};

/**
 * Parse a medium ID from an unknown value.
 */
export const parseMediumId = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};
