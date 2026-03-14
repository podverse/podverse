import type { AddByRSSResourceData } from '@podverse/helpers';

import type {
  AddByRSSListContextState,
  AddByRSSListSortOrder,
} from '../../contexts/AddByRSSListContext';
import {
  getAddByRSSItemByIdText,
  getAddByRSSLivestreamByIdText,
  getAllAddByRSSItems,
  getAllAddByRSSLivestreamItems,
} from './storage';
import type { AddByRSSItemIndexItem, AddByRSSLivestreamIndexItem } from './types';

/**
 * Resolves a synthetic list context from IndexedDB using the current Add-by-RSS item.
 * Used when list context was never set (e.g. after page reload with now-playing restored from server).
 * Returns null if the current item or channel cannot be determined or the item is not in the feed list.
 */
export async function resolveAddByRSSListContextFromCurrentItem(
  currentIdText: string,
  resourceData?: AddByRSSResourceData | null,
  sortOrder: AddByRSSListSortOrder = 'recent'
): Promise<AddByRSSListContextState | null> {
  let channelIdText: string | null = null;
  let isLivestream = false;

  const episodeItem = await getAddByRSSItemByIdText(currentIdText);
  if (episodeItem) {
    channelIdText = episodeItem.channelIdText ?? null;
    isLivestream = false;
  } else {
    const livestreamItem = await getAddByRSSLivestreamByIdText(currentIdText);
    if (livestreamItem) {
      channelIdText = livestreamItem.channelIdText ?? null;
      isLivestream = true;
    }
  }

  if (channelIdText === null && resourceData !== null && resourceData !== undefined) {
    const fromPayload = (resourceData as { channel_id_text?: string }).channel_id_text;
    if (typeof fromPayload === 'string' && fromPayload.trim() !== '') {
      channelIdText = fromPayload.trim();
      isLivestream = false;
    }
  }

  if (channelIdText === null) {
    return null;
  }

  let itemIdTexts: string[];

  if (isLivestream) {
    const all = await getAllAddByRSSLivestreamItems();
    const forChannel = all.filter(
      (item: AddByRSSLivestreamIndexItem) => item.channelIdText === channelIdText
    );
    forChannel.sort((a, b) =>
      sortOrder === 'recent' ? b.startTimeMs - a.startTimeMs : a.startTimeMs - b.startTimeMs
    );
    itemIdTexts = forChannel.map((item: AddByRSSLivestreamIndexItem) => item.idText);
  } else {
    const all = await getAllAddByRSSItems();
    const forChannel = all.filter(
      (item: AddByRSSItemIndexItem) => item.channelIdText === channelIdText
    );
    forChannel.sort((a, b) =>
      sortOrder === 'recent' ? b.pubDateMs - a.pubDateMs : a.pubDateMs - b.pubDateMs
    );
    itemIdTexts = forChannel.map((item: AddByRSSItemIndexItem) => item.idText);
  }

  if (itemIdTexts.length === 0) {
    return null;
  }

  const currentIndex = itemIdTexts.indexOf(currentIdText);
  if (currentIndex < 0) {
    return null;
  }

  return {
    feedIdText: channelIdText,
    itemIdTexts,
    currentIndex,
    sortOrder,
  };
}
