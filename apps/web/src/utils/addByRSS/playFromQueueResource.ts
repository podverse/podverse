/**
 * Load add-by-RSS index item from queue resource data (e.g. for "play next from queue").
 * Uses id_text and start_time (if present = livestream) to fetch from IndexedDB.
 * Falls back to reconstructing from embedded bundle/liveItem data if IndexedDB is empty.
 */

import type { AddByRSSResourceData } from '@podverse/helpers';
import {
  reconstructAddByRSSItemFromResourceData,
  reconstructAddByRSSLivestreamFromResourceData,
} from '@podverse/parser-mapping';
import type { AddByRSSItemIndexItem, AddByRSSLivestreamIndexItem } from './types.js';
import { getAddByRSSItemByIdText, getAddByRSSLivestreamByIdText } from './storage';

/**
 * Load index item from add_by_rss_resource_data payload (queue/playlist API).
 * First tries IndexedDB lookup, then falls back to reconstructing from embedded data.
 * Returns null if neither source is available.
 */
export async function loadAddByRSSIndexItemFromResourceData(
  resourceData: AddByRSSResourceData | null | undefined
): Promise<AddByRSSItemIndexItem | AddByRSSLivestreamIndexItem | null> {
  if (!resourceData || typeof resourceData !== 'object') {
    return null;
  }

  const idText =
    typeof resourceData.id_text === 'string' && resourceData.id_text.trim() !== ''
      ? resourceData.id_text.trim()
      : null;

  const hasStartTime =
    resourceData.start_time !== null &&
    resourceData.start_time !== undefined &&
    resourceData.start_time !== '';

  // Try IndexedDB first (fastest, has latest data if feed was recently parsed)
  if (idText) {
    if (hasStartTime) {
      const livestream = await getAddByRSSLivestreamByIdText(idText);
      if (livestream) {
        return livestream;
      }
    } else {
      const item = await getAddByRSSItemByIdText(idText);
      if (item) {
        return item;
      }
    }
  }

  // Fallback: reconstruct from embedded bundle/liveItem data (cross-device scenario)
  if (hasStartTime) {
    const reconstructed = reconstructAddByRSSLivestreamFromResourceData(resourceData);
    if (reconstructed) {
      return reconstructed;
    }
  } else {
    const reconstructed = reconstructAddByRSSItemFromResourceData(resourceData);
    if (reconstructed) {
      return reconstructed;
    }
  }

  return null;
}
