import type { DTOLegacyPodcastLookupChannel } from './legacyPodcastLookup.js';

/** One lookup accepts at most this many episodes. */
export const LEGACY_EPISODE_LOOKUP_MAX_EPISODES = 200;

/** What a v4 phone stored for one downloaded directory episode. */
export type DTOLegacyEpisodeLookupRef = {
  episode_id: string;
  podcast_id: string;
  guid: string | null;
  media_url: string | null;
};

export type DTOLegacyEpisodeLookupAnswer =
  | {
      episode_id: string;
      kind: 'item';
      item_id_text: string;
      channel: DTOLegacyPodcastLookupChannel;
    }
  | { episode_id: string; kind: 'channel'; channel: DTOLegacyPodcastLookupChannel }
  | { episode_id: string; kind: 'feed_url'; feed_url: string }
  | { episode_id: string; kind: 'blocked' }
  | { episode_id: string; kind: 'not_here' };

export type DTOLegacyEpisodeLookupResponse = { answers: DTOLegacyEpisodeLookupAnswer[] };
