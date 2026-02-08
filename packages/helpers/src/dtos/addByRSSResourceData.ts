/** Image entry shape compatible with findDTOChannelImageBySize / findDTOItemImageBySize. */
export type AddByRSSResourceDataImageEntry = {
  url: string;
  image_width_size: number | null;
};

/**
 * Shape of add_by_rss_resource_data payload returned by queue/playlist/export APIs.
 * Used for display (e.g. title) and compatible with hash extraction (arbitrary keys).
 */
export interface AddByRSSResourceData {
  title?: string;
  channel_images?: AddByRSSResourceDataImageEntry[];
  item_images?: AddByRSSResourceDataImageEntry[];
  [key: string]: unknown;
}
