/**
 * Reconstruct add-by-RSS index items from queue/playlist resource data.
 * Used when client-side storage (IndexedDB) doesn't have the item,
 * e.g., when accessing a queue from a different device.
 */

import type { AddByRSSResourceData, AddByRSSResourceDataImageEntry } from '@podverse/helpers';

import type {
  AddByRSSItemIndexItem,
  AddByRSSLivestreamIndexItem,
  AddByRSSMappedFeed,
} from './types.js';

function isAddByRSSResourceDataImageEntry(value: unknown): value is AddByRSSResourceDataImageEntry {
  return (
    typeof value === 'object' && value !== null && 'url' in value && typeof value.url === 'string'
  );
}

function channelImageUrlFromResourceData(resourceData: AddByRSSResourceData): string | undefined {
  const images = resourceData.channel_images;
  if (!Array.isArray(images)) {
    return undefined;
  }
  for (const entry of images) {
    if (isAddByRSSResourceDataImageEntry(entry) && entry.url !== '') {
      return entry.url;
    }
  }
  return undefined;
}

/**
 * Reconstruct an AddByRSSItemIndexItem from stored resource data (bundle).
 * Used when client-side storage doesn't have the item (e.g., different device).
 *
 * @param resourceData - The add_by_rss_resource_data from queue/playlist API
 * @returns Reconstructed index item, or null if bundle data is missing
 */
export function reconstructAddByRSSItemFromResourceData(
  resourceData: AddByRSSResourceData
): AddByRSSItemIndexItem | null {
  const bundle = resourceData.bundle as AddByRSSMappedFeed['items'][number] | undefined;
  if (!bundle) {
    return null;
  }

  const idText = typeof resourceData.id_text === 'string' ? resourceData.id_text.trim() : '';
  const channelIdText =
    typeof resourceData.channel_id_text === 'string' ? resourceData.channel_id_text.trim() : '';
  const itemGuid = typeof resourceData.guid === 'string' ? resourceData.guid.trim() : '';
  const channelTitle =
    typeof resourceData.channel_title === 'string' ? resourceData.channel_title : '';
  const channelImageUrl = channelImageUrlFromResourceData(resourceData);
  const mediumId = typeof resourceData.medium_id === 'number' ? resourceData.medium_id : null;

  // Parse pub_date back to milliseconds
  let pubDateMs = 0;
  if (typeof resourceData.pub_date === 'string' && resourceData.pub_date) {
    const parsed = Date.parse(resourceData.pub_date);
    if (!isNaN(parsed)) {
      pubDateMs = parsed;
    }
  }

  return {
    id: `${channelIdText}-${itemGuid}`,
    idText,
    itemGuid,
    channelIdText,
    channelTitle,
    channelImageUrl,
    mediumId,
    bundle,
    pubDateMs,
  };
}

/**
 * Reconstruct an AddByRSSLivestreamIndexItem from stored resource data.
 * Used when client-side storage doesn't have the item (e.g., different device).
 *
 * @param resourceData - The add_by_rss_resource_data from queue/playlist API
 * @returns Reconstructed livestream index item, or null if liveItem/item data is missing
 */
export function reconstructAddByRSSLivestreamFromResourceData(
  resourceData: AddByRSSResourceData
): AddByRSSLivestreamIndexItem | null {
  const liveItem = resourceData.liveItem as
    AddByRSSMappedFeed['liveItems'][number]['liveItem'] | undefined;
  const livestreamItem = resourceData.livestream_item as
    AddByRSSMappedFeed['liveItems'][number]['item'] | undefined;

  if (!liveItem || !livestreamItem) {
    return null;
  }

  const idText = typeof resourceData.id_text === 'string' ? resourceData.id_text.trim() : '';
  const channelIdText =
    typeof resourceData.channel_id_text === 'string' ? resourceData.channel_id_text.trim() : '';
  const itemGuid = typeof resourceData.guid === 'string' ? resourceData.guid.trim() : '';
  const channelTitle =
    typeof resourceData.channel_title === 'string' ? resourceData.channel_title : '';
  const channelImageUrl = channelImageUrlFromResourceData(resourceData);
  const mediumId = typeof resourceData.medium_id === 'number' ? resourceData.medium_id : null;

  // Parse start_time back to milliseconds
  let startTimeMs = 0;
  if (typeof resourceData.start_time === 'string' && resourceData.start_time) {
    const parsed = Date.parse(resourceData.start_time);
    if (!isNaN(parsed)) {
      startTimeMs = parsed;
    }
  }

  return {
    id: `${channelIdText}-${itemGuid}`,
    idText,
    itemGuid,
    channelIdText,
    channelTitle,
    channelImageUrl,
    mediumId,
    liveItem,
    item: livestreamItem,
    startTimeMs,
  };
}
