/** Image entry shape compatible with findDTOChannelImageBySize / findDTOItemImageBySize. */
export type AddByRSSResourceDataImageEntry = {
  url: string;
  image_width_size: number | null;
};

/**
 * Shape of add_by_rss_resource_data payload returned by queue/playlist/export APIs.
 * Used for display (e.g. title) and compatible with hash extraction (arbitrary keys).
 *
 * Includes full item data (bundle/liveItem/livestream_item) for cross-device access
 * when the feed has not been parsed on the current device's IndexedDB.
 */
export interface AddByRSSResourceData {
  title?: string;
  channel_images?: AddByRSSResourceDataImageEntry[];
  item_images?: AddByRSSResourceDataImageEntry[];
  /** Full episode/track bundle data from ParsedRSSFeedCompatBundle['items'][number] */
  bundle?: unknown;
  /** Livestream liveItem data (status, start_time, end_time, chat_web_url) */
  liveItem?: unknown;
  /** Livestream raw item data (enclosure, alternativeEnclosures, etc.) */
  livestream_item?: unknown;
  [key: string]: unknown;
}
