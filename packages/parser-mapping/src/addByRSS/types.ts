/**
 * Add-by-RSS index item types for storing parsed feed items in client-side storage
 * (IndexedDB, SQLite, etc.) and reconstructing from queue/playlist resource data.
 */

import type { ParsedRSSFeedCompatBundle } from '../compat/partytime/compatFull.js';

/** Alias for the mapped feed bundle type */
export type AddByRSSMappedFeed = ParsedRSSFeedCompatBundle;

/**
 * Index item for an add-by-RSS episode or track.
 * Stored in client-side database (IndexedDB) for fast lookup.
 */
export type AddByRSSItemIndexItem = {
  /** Composite ID: `${channelIdText}-${itemGuid}` */
  id: string;
  /** Text identifier for database lookups */
  idText: string;
  /** Episode/track GUID from the feed */
  itemGuid: string;
  /** Parent channel text identifier */
  channelIdText: string;
  /** Parent channel title */
  channelTitle: string;
  /** Parent channel image URL */
  channelImageUrl?: string;
  /** Medium type enum (Podcast=1, Video=2, Music=3, etc.) */
  mediumId: number | null;
  /** Full item bundle from parsed feed */
  bundle: AddByRSSMappedFeed['items'][number];
  /** Publication date as milliseconds since epoch */
  pubDateMs: number;
};

/**
 * Index item for an add-by-RSS livestream.
 * Stored in client-side database (IndexedDB) for fast lookup.
 */
export type AddByRSSLivestreamIndexItem = {
  /** Composite ID: `${channelIdText}-${itemGuid}` */
  id: string;
  /** Text identifier for database lookups */
  idText: string;
  /** Livestream GUID from the feed */
  itemGuid: string;
  /** Parent channel text identifier */
  channelIdText: string;
  /** Parent channel title */
  channelTitle: string;
  /** Parent channel image URL */
  channelImageUrl?: string;
  /** Medium type enum */
  mediumId: number | null;
  /** Live item metadata (status, start/end time, chat URL) */
  liveItem: AddByRSSMappedFeed['liveItems'][number]['liveItem'];
  /** Raw livestream item data (enclosure, description, etc.) */
  item: AddByRSSMappedFeed['liveItems'][number]['item'];
  /** Start time as milliseconds since epoch */
  startTimeMs: number;
};
