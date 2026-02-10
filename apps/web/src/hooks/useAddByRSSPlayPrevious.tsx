'use client';

import { useCallback } from 'react';
import type { AddByRSSListContextState } from '../contexts/AddByRSSListContext';
import { useAddByRSSListContext } from '../contexts/AddByRSSListContext';
import { usePlayAddByRSS } from './usePlayAddByRSS';
import { getAddByRSSItemByIdText, getAddByRSSLivestreamByIdText } from '../utils/addByRSS/storage';

/**
 * Returns a function to try playing the previous add-by-RSS item from list context.
 * Previous = chronologically older (one step back in oldest-to-newest order).
 * When list context is empty, caller may pass a fallback context (e.g. resolved from IndexedDB).
 * Returns true if playback was started, false otherwise (caller should seek to 0 when false).
 */
export function useAddByRSSPlayPrevious() {
  const { listContext, setAddByRSSListContext } = useAddByRSSListContext();
  const playAddByRSS = usePlayAddByRSS();

  return useCallback(
    async (fallbackContext?: AddByRSSListContextState | null): Promise<boolean> => {
      const effectiveContext = listContext ?? fallbackContext ?? null;
      const sortOrder = effectiveContext?.sortOrder ?? 'recent';
      if (!effectiveContext || effectiveContext.itemIdTexts.length === 0) {
        return false;
      }
      const previousIndex =
        sortOrder === 'oldest'
          ? effectiveContext.currentIndex - 1
          : effectiveContext.currentIndex + 1;
      if (previousIndex < 0 || previousIndex >= effectiveContext.itemIdTexts.length) {
        return false;
      }
      const previousIdText = effectiveContext.itemIdTexts[previousIndex];
      if (!previousIdText || typeof previousIdText !== 'string') {
        return false;
      }
      const item = await getAddByRSSItemByIdText(previousIdText);
      const indexItem = item ?? (await getAddByRSSLivestreamByIdText(previousIdText));
      if (!indexItem) {
        return false;
      }
      await playAddByRSS(indexItem);
      const isFirstInDirection =
        sortOrder === 'oldest'
          ? previousIndex <= 0
          : previousIndex >= effectiveContext.itemIdTexts.length - 1;
      if (isFirstInDirection) {
        setAddByRSSListContext(null);
      } else {
        setAddByRSSListContext({
          ...effectiveContext,
          currentIndex: previousIndex,
          sortOrder,
        });
      }
      return true;
    },
    [listContext, setAddByRSSListContext, playAddByRSS]
  );
}
