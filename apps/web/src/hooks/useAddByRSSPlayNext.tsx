'use client';

import { useCallback } from 'react';

import type { AddByRSSListContextState } from '../contexts/AddByRSSListContext';
import { useAddByRSSListContext } from '../contexts/AddByRSSListContext';
import { getAddByRSSItemByIdText, getAddByRSSLivestreamByIdText } from '../utils/addByRSS/storage';
import { usePlayAddByRSS } from './usePlayAddByRSS';

/**
 * Returns a function to try playing the next add-by-RSS item from list context (for autoplay when current ends).
 * If list context has a next index, loads that item from IndexedDB and plays it; then advances or clears context.
 * When list context is empty, caller may pass a fallback context (e.g. resolved from IndexedDB by current item).
 * Returns true if playback was started, false otherwise.
 */
export function useAddByRSSPlayNext() {
  const { listContext, setAddByRSSListContext } = useAddByRSSListContext();
  const playAddByRSS = usePlayAddByRSS();

  return useCallback(
    async (fallbackContext?: AddByRSSListContextState | null): Promise<boolean> => {
      const effectiveContext = listContext ?? fallbackContext ?? null;
      const sortOrder = effectiveContext?.sortOrder ?? 'recent';
      if (!effectiveContext || effectiveContext.itemIdTexts.length === 0) {
        return false;
      }
      const nextIndex =
        sortOrder === 'oldest'
          ? effectiveContext.currentIndex + 1
          : effectiveContext.currentIndex - 1;
      if (sortOrder === 'oldest') {
        if (nextIndex >= effectiveContext.itemIdTexts.length) {
          setAddByRSSListContext(null);
          return false;
        }
      } else {
        if (nextIndex < 0) {
          setAddByRSSListContext(null);
          return false;
        }
      }
      const nextIdText = effectiveContext.itemIdTexts[nextIndex];
      if (!nextIdText || typeof nextIdText !== 'string') {
        return false;
      }
      const item = await getAddByRSSItemByIdText(nextIdText);
      const indexItem = item ?? (await getAddByRSSLivestreamByIdText(nextIdText));
      if (!indexItem) {
        return false;
      }
      await playAddByRSS(indexItem);
      const isLastInDirection =
        sortOrder === 'oldest'
          ? nextIndex >= effectiveContext.itemIdTexts.length - 1
          : nextIndex === 0;
      if (isLastInDirection) {
        setAddByRSSListContext(null);
      } else {
        setAddByRSSListContext({
          ...effectiveContext,
          currentIndex: nextIndex,
          sortOrder,
        });
      }
      return true;
    },
    [listContext, setAddByRSSListContext, playAddByRSS]
  );
}
