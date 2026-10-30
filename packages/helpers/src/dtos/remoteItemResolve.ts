import type { IndexProviderId } from '../lib/indexProvider.js';
import type { DTOChannelDirectoryMatch } from './channel/channelDirectoryMatch.js';
import type { DTORemoteItemStub } from './remoteItem.js';

/**
 * One remote feed reference from a device-stored Add by RSS feed. At least one key is set.
 */
export type AddByRSSRemoteItemRef = {
  feed_guid: string | null;
  feed_url: string | null;
};

/** One lookup reference. A non-empty `item_guid` makes it an item reference. */
export type AddByRSSRemoteItemLookupRef = AddByRSSRemoteItemRef & {
  item_guid: string | null;
};

/**
 * What the provider search detail needs to open and paint its first frame.
 */
export type DTOIndexProviderFeedTarget = {
  index_provider: IndexProviderId;
  provider_feed_id: string;
  feed_url: string;
  title: string | null;
  author: string | null;
  image_url: string | null;
};

/** A public parsed directory item an item reference names. */
export type DTOAddByRSSDirectoryItemMatch = {
  id_text: string;
  title: string | null;
  /** The item's channel; its `medium_id` picks the episode or track route. */
  channel: DTOChannelDirectoryMatch;
};

export type DTOAddByRSSRemoteItemLookupResult =
  | { kind: 'channel'; channel: DTOChannelDirectoryMatch }
  | { kind: 'item'; item: DTOAddByRSSDirectoryItemMatch }
  | { kind: 'provider_feed'; provider_feed: DTOIndexProviderFeedTarget }
  | { kind: 'item_stub'; item_stub: DTORemoteItemStub }
  | { kind: 'none' };

export type DTOAddByRSSRemoteItemLookupResponse = {
  /** Aligned with the request's `refs`. */
  results: DTOAddByRSSRemoteItemLookupResult[];
};

export type DTOAddByRSSRemoteItemResolveResult =
  | { kind: 'channel'; channel: DTOChannelDirectoryMatch }
  | { kind: 'provider_feed'; provider_feed: DTOIndexProviderFeedTarget }
  /** The provider does not know the feed (or reports it as no longer updating). */
  | { kind: 'not_found' }
  /** Podverse has a feed row for it that is not a public parsed channel (parsing, hidden, or blocked). */
  | { kind: 'directory_unavailable' };

export const ADD_BY_RSS_REMOTE_ITEM_LOOKUP_MAX_REFS = 100;
