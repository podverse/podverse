import type { DTOChannelDirectoryMatch } from '../channel/channelDirectoryMatch.js';

/** One lookup accepts at most this many legacy podcast ids. */
export const LEGACY_PODCAST_LOOKUP_MAX_IDS = 2000;

/**
 * Optional header. When it is 16–64 characters of letters, digits, underscore, or hyphen, the
 * lookup also counts against the per-install limit.
 */
export const LEGACY_INSTALL_ID_HEADER = 'x-podverse-install-id';

/** Directory channel plus the list artwork URL the phone stores on the local subscription. */
export type DTOLegacyPodcastLookupChannel = DTOChannelDirectoryMatch & {
  image_url: string | null;
};

export type DTOLegacyPodcastLookupAnswer =
  | { podcast_id: string; kind: 'channel'; channel: DTOLegacyPodcastLookupChannel }
  | { podcast_id: string; kind: 'feed_url'; feed_url: string }
  | { podcast_id: string; kind: 'blocked' }
  | { podcast_id: string; kind: 'not_here' };

export type DTOLegacyPodcastLookupResponse = { answers: DTOLegacyPodcastLookupAnswer[] };
