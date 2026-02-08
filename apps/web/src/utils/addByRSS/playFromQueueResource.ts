/**
 * Load add-by-RSS index item from queue resource data (e.g. for "play next from queue").
 * Uses id_text and start_time (if present = livestream) to fetch from IndexedDB.
 */

import type { AddByRSSResourceData } from '@podverse/helpers';
import type { AddByRSSItemIndexItem, AddByRSSLivestreamIndexItem } from './types.js';
import { getAddByRSSItemByIdText, getAddByRSSLivestreamByIdText } from './storage';

/**
 * Load index item from add_by_rss_resource_data payload (queue/playlist API).
 * Returns null if id_text missing or storage lookup fails.
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
  if (!idText) {
    return null;
  }
  const hasStartTime =
    resourceData.start_time !== null &&
    resourceData.start_time !== undefined &&
    resourceData.start_time !== '';
  if (hasStartTime) {
    const livestream = await getAddByRSSLivestreamByIdText(idText);
    return livestream;
  }
  const item = await getAddByRSSItemByIdText(idText);
  return item;
}
