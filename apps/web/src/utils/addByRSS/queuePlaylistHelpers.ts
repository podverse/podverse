/**
 * Add-by-RSS queue and playlist: build minimal hash input and full resource
 * payload for API. Same resource => same add_by_rss_hash_id (matches backend).
 *
 * Hash uses channel_id_text + guid (primary) or channel_id_text + enclosure_url (fallback).
 */

import { getAddByRSSHashId as getAddByRSSHashIdFromHelpers } from '@podverse/helpers';

import type { AddByRSSItemIndexItem, AddByRSSLivestreamIndexItem } from './types.js';

/** Image entry shape compatible with findDTOChannelImageBySize / findDTOItemImageBySize. */
type AddByRSSResourceDataImageEntry = {
  url: string;
  image_width_size: number | null;
};

function toIsoString(ms: number): string {
  return ms > 1e12 ? new Date(ms).toISOString() : new Date(ms * 1000).toISOString();
}

function hasLivestreamImageUrl(o: unknown): o is { image: string } {
  return (
    typeof o === 'object' &&
    o !== null &&
    'image' in o &&
    typeof (o as { image: unknown }).image === 'string'
  );
}

function getTitleFromEpisodeItem(
  item: AddByRSSItemIndexItem | AddByRSSLivestreamIndexItem
): string {
  if (
    'bundle' in item &&
    item.bundle?.item?.title !== null &&
    item.bundle?.item?.title !== undefined
  ) {
    const t = item.bundle.item.title;
    return typeof t === 'string' ? t.trim() : '';
  }
  if ('item' in item && item.item) {
    const t = item.item.title;
    return typeof t === 'string' ? t.trim() : '';
  }
  return '';
}

/**
 * Extract enclosure URL from an index item.
 * For episodes: bundle.enclosures[0].item_enclosure_sources[0].uri
 * For livestreams: item.enclosure.url
 */
function getEnclosureUrl(item: AddByRSSItemIndexItem | AddByRSSLivestreamIndexItem): string {
  if ('bundle' in item && item.bundle?.enclosures?.length) {
    const enc = item.bundle.enclosures[0];
    const uri = enc?.item_enclosure_sources?.[0]?.uri;
    return typeof uri === 'string' ? uri.trim() : '';
  }
  if ('item' in item && item.item?.enclosure) {
    const url = item.item.enclosure.url;
    return typeof url === 'string' ? url.trim() : '';
  }
  return '';
}

/**
 * Build minimal hash input from an index item.
 * Uses channel_id_text + guid (primary) or channel_id_text + enclosure_url (fallback).
 * Must match backend extractAddByRSSHashInput logic.
 */
export function buildAddByRSSHashInput(
  item: AddByRSSItemIndexItem | AddByRSSLivestreamIndexItem
): Record<string, string> {
  const out: Record<string, string> = {};

  const channel_id_text = item.channelIdText?.trim() ?? '';
  if (channel_id_text) {
    out['channel_id_text'] = channel_id_text;
  }

  const guid = item.itemGuid?.trim() ?? '';
  if (guid) {
    // Primary: channel_id_text + guid
    out['guid'] = guid;
  } else {
    // Fallback: channel_id_text + enclosure_url (if no guid)
    const enclosure_url = getEnclosureUrl(item);
    if (enclosure_url) {
      out['enclosure_url'] = enclosure_url;
    }
  }

  return out;
}

/**
 * Shape of add_by_rss_resource_data used by queue/playlist API and modal state.
 * Allows optional medium_id and title for display; other keys allowed for API payload.
 */
export type AddByRSSResourceDataPayload = {
  medium_id?: number | null;
  title?: string;
  channel_images?: AddByRSSResourceDataImageEntry[];
  item_images?: AddByRSSResourceDataImageEntry[];
  [key: string]: unknown;
};

/**
 * Build full add_by_rss_resource_data payload for queue/playlist API.
 * Includes minimal hash keys (same normalization as hash input) plus id_text,
 * medium_id, enclosure and channel info for playback/display.
 */
export function buildAddByRSSResourceData(
  item: AddByRSSItemIndexItem | AddByRSSLivestreamIndexItem
): AddByRSSResourceDataPayload {
  const channel_id_text = item.channelIdText?.trim() ?? '';
  const guid = item.itemGuid?.trim() ?? '';
  const title = getTitleFromEpisodeItem(item);
  const pub_date = 'pubDateMs' in item ? toIsoString(item.pubDateMs) : '';

  const channel_images: AddByRSSResourceDataImageEntry[] = item.channelImageUrl
    ? [{ url: item.channelImageUrl, image_width_size: null }]
    : [];

  let item_images: AddByRSSResourceDataImageEntry[] = [];
  if ('bundle' in item && Array.isArray(item.bundle?.images) && item.bundle.images.length > 0) {
    item_images = item.bundle.images;
  } else if ('item' in item && hasLivestreamImageUrl(item.item)) {
    item_images = [{ url: item.item.image, image_width_size: null }];
  }

  const payload: AddByRSSResourceDataPayload = {
    channel_id_text,
    guid,
    title,
    pub_date,
    id_text: item.idText ?? '',
    medium_id: item.mediumId ?? null,
    channel_title: item.channelTitle ?? null,
    channel_image_url: item.channelImageUrl ?? null,
    channel_images,
    item_images,
  };

  if ('startTimeMs' in item && item.startTimeMs !== null && item.startTimeMs !== undefined) {
    payload.start_time = toIsoString(item.startTimeMs);
  }

  if ('bundle' in item && item.bundle?.enclosures?.length) {
    const enc = item.bundle.enclosures[0];
    payload.enclosure_url = enc?.item_enclosure_sources?.[0]?.uri ?? null;
    payload.duration = enc?.item_enclosure?.length ?? null;
  }
  if ('item' in item && item.item?.enclosure) {
    const enc = item.item.enclosure;
    payload.enclosure_url = enc.url ?? null;
    payload.duration = enc.length ?? null;
  }

  return payload;
}

/**
 * Compute add_by_rss_hash_id for an index item (matches backend).
 * Use for remove-from-queue/playlist by hash.
 */
export function getAddByRSSHashId(
  item: AddByRSSItemIndexItem | AddByRSSLivestreamIndexItem
): string {
  const minimal = buildAddByRSSHashInput(item);
  return getAddByRSSHashIdFromHelpers(minimal);
}
