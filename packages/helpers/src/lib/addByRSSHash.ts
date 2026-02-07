/**
 * Add-by-RSS hash: compute add_by_rss_hash_id from a minimal, stable set of
 * fields only (same feed + guid + title + pub_date => same hash). Used by
 * queue and playlist ORM; client (01b) must use the same key order and
 * normalization for remove-from-queue/playlist to work.
 */

import { getMd5Hash } from './hash.js';

/** Keys for minimal hash input, in fixed order. Livestream may include start_time. */
const ADD_BY_RSS_HASH_KEY_ORDER: readonly string[] = [
  'channel_id_text',
  'guid',
  'title',
  'pub_date',
  'start_time',
];

function toHashString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'number') {
    if (value > 1e12) {
      return new Date(value).toISOString();
    }
    return new Date(value * 1000).toISOString();
  }
  const s = String(value).trim();
  return s === '' ? null : s;
}

/**
 * Extract minimal hash input from add_by_rss_resource_data (full payload).
 * Returns an object with fixed key order and string values only; omits
 * undefined. Used so getMd5Hash produces a stable hash regardless of
 * full payload key order.
 */
export function extractAddByRSSHashInput(data: unknown): Record<string, string> {
  if (!data || typeof data !== 'object') {
    return {};
  }
  const record = data as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const key of ADD_BY_RSS_HASH_KEY_ORDER) {
    const value = toHashString(record[key]);
    if (value !== null) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Compute add_by_rss_hash_id from full add_by_rss_resource_data payload.
 * Hashes only the minimal set (channel_id_text, guid, title, pub_date,
 * start_time when present) so same logical resource yields the same hash.
 */
export function getAddByRSSHashId(addByRSSResourceData: unknown): string {
  const minimal = extractAddByRSSHashInput(addByRSSResourceData);
  return getMd5Hash(minimal);
}
