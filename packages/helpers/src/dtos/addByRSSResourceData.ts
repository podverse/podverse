/**
 * Shape of add_by_rss_resource_data payload returned by queue/playlist/export APIs.
 * Used for display (e.g. title) and compatible with hash extraction (arbitrary keys).
 */
export interface AddByRSSResourceData {
  title?: string;
  [key: string]: unknown;
}
