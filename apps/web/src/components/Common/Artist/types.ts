export const ARTIST_ROW_UPDATED_TEST_ID = 'artist-row-updated';

export type ArtistListItem = {
  id: string;
  title: string;
  /** Ordered URLs for Image fallback (shrunken then originals). */
  imageCandidates?: string[];
  href: string;
  subtitle?: string | null;
  showSubtitle?: boolean;
  lastPubDate?: string | null;
};
