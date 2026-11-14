import type { DTOChannelDirectoryMatch } from './channelDirectoryMatch.js';

/** One request may name this many Add by RSS feeds. */
export const ADD_BY_RSS_DIRECTORY_MATCH_MAX_FEEDS = 100;

/** One request may name this many episode references, across every feed. */
export const ADD_BY_RSS_DIRECTORY_MATCH_MAX_ITEMS = 500;

export type DTOAddByRSSMatchItemRef = { guid: string | null; enclosure_url: string | null };

export type DTOAddByRSSMatchFeedRef = {
  feed_url: string;
  feed_guid: string | null;
  items: DTOAddByRSSMatchItemRef[];
};

export type DTOAddByRSSMatchItem = DTOAddByRSSMatchItemRef & { item_id_text: string | null };

export type DTOAddByRSSMatchFeed = {
  feed_url: string;
  channel: DTOChannelDirectoryMatch | null;
  items: DTOAddByRSSMatchItem[];
};

export type DTOAddByRSSMatchResponse = { matches: DTOAddByRSSMatchFeed[] };

export type DTOAddByRSSConvertedItem = { add_by_rss_hash_id: string; item_id_text: string };

export type DTOAddByRSSConvertResponse =
  | {
      converted: true;
      channel: DTOChannelDirectoryMatch;
      items: DTOAddByRSSConvertedItem[];
      queue_rows_moved: number;
      queue_rows_dropped: number;
      playlist_rows_moved: number;
      playlist_rows_dropped: number;
    }
  | {
      converted: false;
      reason: 'no_match' | 'not_followed' | 'requires_credentials' | 'follow_limit';
      channel: DTOChannelDirectoryMatch | null;
    };
