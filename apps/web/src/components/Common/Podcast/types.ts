import type { ChannelUnseenBadge } from '@podverse/helpers';

export type PodcastListItem = {
  id: string;
  title: string;
  /** Ordered URLs for Image fallback (shrunken then originals). */
  imageCandidates?: string[];
  href: string;
  lastPubDate?: string | null;
  /** Unseen episodes since the account last opened this channel. Absent where nothing is unseen. */
  unseenBadge?: ChannelUnseenBadge | null;
};
