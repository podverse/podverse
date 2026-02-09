/**
 * Add-by-RSS hash: compute add_by_rss_hash_id from a minimal, stable set of
 * fields. Uses channel_id_text + guid as primary identifier. Falls back to
 * channel_id_text + enclosure_url if guid is missing.
 *
 * Used by queue and playlist ORM; client must use the same logic for
 * remove-from-queue/playlist to work.
 */

import { getMd5Hash } from './hash.js';

function toHashString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const s = String(value).trim();
  return s === '' ? null : s;
}

/**
 * Extract minimal hash input from add_by_rss_resource_data (full payload).
 * Returns an object with channel_id_text + guid (primary) or
 * channel_id_text + enclosure_url (fallback if no guid).
 */
export function extractAddByRSSHashInput(data: unknown): Record<string, string> {
  if (!data || typeof data !== 'object') {
    return {};
  }
  const record = data as Record<string, unknown>;
  const result: Record<string, string> = {};

  const channelIdText = toHashString(record['channel_id_text']);
  if (channelIdText) {
    result['channel_id_text'] = channelIdText;
  }

  const guid = toHashString(record['guid']);
  if (guid) {
    // Primary: channel_id_text + guid
    result['guid'] = guid;
  } else {
    // Fallback: channel_id_text + enclosure_url (if no guid)
    const enclosureUrl = toHashString(record['enclosure_url']);
    if (enclosureUrl) {
      result['enclosure_url'] = enclosureUrl;
    }
  }

  return result;
}

/**
 * Compute add_by_rss_hash_id from full add_by_rss_resource_data payload.
 * Uses channel_id_text + guid, or channel_id_text + enclosure_url as fallback.
 */
export function getAddByRSSHashId(addByRSSResourceData: unknown): string {
  const minimal = extractAddByRSSHashInput(addByRSSResourceData);
  return getMd5Hash(minimal);
}
