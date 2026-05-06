export type ArtistListItem = {
  id: string;
  title: string;
  /** Ordered URLs for Image fallback (shrunken then originals). */
  imageCandidates?: string[];
  href: string;
  subtitle?: string | null;
  showSubtitle?: boolean;
};
