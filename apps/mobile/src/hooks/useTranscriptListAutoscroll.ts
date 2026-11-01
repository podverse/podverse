import type { RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { FlatList, ListViewToken } from 'react-native';

import {
  resolveTranscriptScrollAlign,
  type TranscriptScrollAlign,
} from '@podverse/helpers/transcript';

/** Fallback row height when `scrollToIndex` fails before the cell is measured. */
const TRANSCRIPT_ROW_ESTIMATED_HEIGHT = 64;

const MAX_SCROLL_RETRIES = 3;

export type TranscriptListAutoscrollParams<ItemT> = {
  activeIndex: number;
  autoScrollOn: boolean;
  /**
   * Extra rows before the first cue (sticky follow bar). Cue index `i` scrolls to
   * `i + dataIndexOffset`.
   */
  dataIndexOffset: number;
  listRef: RefObject<FlatList<ItemT> | null>;
};

/**
 * Scrolls the active transcript cue into view when Autoscroll is on and the cue is off screen.
 * Uses viewability to decide above vs below; retries after an approximate offset when the row is
 * not yet mounted.
 *
 * Pass `onViewableItemsChanged` and `viewabilityConfig` on every render of the list that owns
 * them. FlatList rejects a later change from a missing callback to a present one.
 */
export function useTranscriptListAutoscroll<ItemT>(params: TranscriptListAutoscrollParams<ItemT>): {
  onScrollToIndexFailed: (info: { averageItemLength: number; index: number }) => void;
  onViewableItemsChanged: (info: { viewableItems: ListViewToken[] }) => void;
  viewabilityConfig: { itemVisiblePercentThreshold: number };
} {
  const { activeIndex, autoScrollOn, dataIndexOffset, listRef } = params;
  const visibleRangeRef = useRef<{ endIndex: number; startIndex: number } | null>(null);
  const pendingAlignRef = useRef<TranscriptScrollAlign | null>(null);
  const retryCountRef = useRef(0);

  const viewabilityConfig = useMemo(
    () => ({
      itemVisiblePercentThreshold: 50,
    }),
    []
  );

  const scrollToActive = useCallback(
    (align: TranscriptScrollAlign) => {
      const list = listRef.current;
      if (list === null || activeIndex < 0) {
        return;
      }
      pendingAlignRef.current = align;
      retryCountRef.current = 0;
      list.scrollToIndex({
        animated: true,
        index: activeIndex + dataIndexOffset,
        viewPosition: align === 'start' ? 0 : 1,
      });
    },
    [activeIndex, dataIndexOffset, listRef]
  );

  const maybeScroll = useCallback(() => {
    if (!autoScrollOn || activeIndex < 0) {
      return;
    }
    const visible = visibleRangeRef.current;
    if (visible === null) {
      scrollToActive('start');
      return;
    }
    const align = resolveTranscriptScrollAlign({
      activeIndex: activeIndex + dataIndexOffset,
      visibleEndIndex: visible.endIndex,
      visibleStartIndex: visible.startIndex,
    });
    if (align === null) {
      return;
    }
    scrollToActive(align);
  }, [activeIndex, autoScrollOn, dataIndexOffset, scrollToActive]);

  useEffect(() => {
    maybeScroll();
  }, [maybeScroll]);

  const onViewableItemsChanged = useCallback((info: { viewableItems: ListViewToken[] }) => {
    const indexes = info.viewableItems
      .map((token) => token.index)
      .filter((index): index is number => typeof index === 'number' && index >= 0);
    const firstIndex = indexes[0];
    if (firstIndex === undefined) {
      return;
    }
    let startIndex = firstIndex;
    let endIndex = firstIndex;
    for (const index of indexes) {
      if (index < startIndex) {
        startIndex = index;
      }
      if (index > endIndex) {
        endIndex = index;
      }
    }
    visibleRangeRef.current = { endIndex, startIndex };
  }, []);

  const onScrollToIndexFailed = useCallback(
    (info: { averageItemLength: number; index: number }) => {
      const list = listRef.current;
      if (list === null) {
        return;
      }
      const average =
        info.averageItemLength > 0 ? info.averageItemLength : TRANSCRIPT_ROW_ESTIMATED_HEIGHT;
      list.scrollToOffset({
        animated: false,
        offset: average * info.index,
      });
      const align = pendingAlignRef.current ?? 'start';
      if (retryCountRef.current >= MAX_SCROLL_RETRIES) {
        return;
      }
      retryCountRef.current += 1;
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({
          animated: true,
          index: info.index,
          viewPosition: align === 'start' ? 0 : 1,
        });
      });
    },
    [listRef]
  );

  return {
    onScrollToIndexFailed,
    onViewableItemsChanged,
    viewabilityConfig,
  };
}
