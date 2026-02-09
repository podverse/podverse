'use client';

import { useCallback } from 'react';
import { useAddByRSSListContext } from '../contexts/AddByRSSListContext';
import { usePlayAddByRSS } from './usePlayAddByRSS';
import { getAddByRSSItemByIdText, getAddByRSSLivestreamByIdText } from '../utils/addByRSS/storage';

/**
 * Returns a function to try playing the next add-by-RSS item from list context (for autoplay when current ends).
 * If list context has a next index, loads that item from IndexedDB and plays it; then advances or clears context.
 */
export function useAddByRSSPlayNext() {
  const { listContext, setAddByRSSListContext } = useAddByRSSListContext();
  const playAddByRSS = usePlayAddByRSS();

  return useCallback(async () => {
    if (!listContext || listContext.itemIdTexts.length === 0) {
      return;
    }
    const nextIndex = listContext.currentIndex + 1;
    if (nextIndex >= listContext.itemIdTexts.length) {
      setAddByRSSListContext(null);
      return;
    }
    const nextIdText = listContext.itemIdTexts[nextIndex];
    if (!nextIdText || typeof nextIdText !== 'string') {
      return;
    }
    const item = await getAddByRSSItemByIdText(nextIdText);
    const indexItem = item ?? (await getAddByRSSLivestreamByIdText(nextIdText));
    if (!indexItem) {
      return;
    }
    await playAddByRSS(indexItem);
    if (nextIndex + 1 >= listContext.itemIdTexts.length) {
      setAddByRSSListContext(null);
    } else {
      setAddByRSSListContext({
        ...listContext,
        currentIndex: nextIndex,
      });
    }
  }, [listContext, setAddByRSSListContext, playAddByRSS]);
}
