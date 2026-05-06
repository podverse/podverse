export type PodcastListItem = {
  id: string;
  title: string;
  /** Ordered URLs for Image fallback (shrunken then originals). */
  imageCandidates?: string[];
  href: string;
  lastPubDate?: string | null;
};
