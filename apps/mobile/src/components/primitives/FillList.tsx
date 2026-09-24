import type { ForwardedRef, ReactElement, Ref } from 'react';
import { forwardRef, useCallback, useRef } from 'react';
import type { FlatListProps, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { FlatList, StyleSheet } from 'react-native';

import { beginPerfScrollSample, endPerfScrollSample } from '../../lib/perf/perfFrames';
import { applyFillListRenderWindow, LIST_REMOVE_CLIPPED_SUBVIEWS } from './listVirtualization';

/** Props `FillList` owns: scroll lock derives from the fill state, clipping is fixed app-wide. */
type LockedProps =
  'alwaysBounceVertical' | 'bounces' | 'overScrollMode' | 'removeClippedSubviews' | 'scrollEnabled';

export type FillListProps<ItemT> = Omit<FlatListProps<ItemT>, LockedProps>;

/**
 * True when the list is showing a fill empty (VerticalCenter, LoadingSection, CallToActionSection)
 * rather than rows. Those states have nothing to scroll, so bounce and pull stay off.
 */
export function isFillListScrollLocked(
  data: FlatListProps<unknown>['data'],
  listEmpty: FlatListProps<unknown>['ListEmptyComponent']
): boolean {
  const itemCount = data === null || data === undefined ? 0 : data.length;
  if (itemCount > 0) {
    return false;
  }

  return listEmpty !== null && listEmpty !== undefined;
}

const fillContent = StyleSheet.create({
  grow: {
    flexGrow: 1,
  },
});

function FillListInner<ItemT>(
  {
    ListEmptyComponent,
    contentContainerStyle,
    data,
    onMomentumScrollBegin,
    onMomentumScrollEnd,
    onScrollBeginDrag,
    onScrollEndDrag,
    refreshControl,
    ...rest
  }: FillListProps<ItemT>,
  ref: ForwardedRef<FlatList<ItemT>>
): ReactElement {
  const lockScroll = isFillListScrollLocked(data, ListEmptyComponent);
  const endDragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearEndDragTimer = useCallback(() => {
    if (endDragTimerRef.current === null) {
      return;
    }
    clearTimeout(endDragTimerRef.current);
    endDragTimerRef.current = null;
  }, []);

  const handleScrollBeginDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      clearEndDragTimer();
      beginPerfScrollSample();
      onScrollBeginDrag?.(event);
    },
    [clearEndDragTimer, onScrollBeginDrag]
  );

  const handleMomentumScrollBegin = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      clearEndDragTimer();
      beginPerfScrollSample();
      onMomentumScrollBegin?.(event);
    },
    [clearEndDragTimer, onMomentumScrollBegin]
  );

  const handleScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // Finger-up may be followed by momentum. Defer the end so a fling is one sample window.
      clearEndDragTimer();
      endDragTimerRef.current = setTimeout(() => {
        endDragTimerRef.current = null;
        endPerfScrollSample();
      }, 80);
      onScrollEndDrag?.(event);
    },
    [clearEndDragTimer, onScrollEndDrag]
  );

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      clearEndDragTimer();
      endPerfScrollSample();
      onMomentumScrollEnd?.(event);
    },
    [clearEndDragTimer, onMomentumScrollEnd]
  );

  return (
    <FlatList
      {...applyFillListRenderWindow(rest)}
      ListEmptyComponent={ListEmptyComponent}
      alwaysBounceVertical={!lockScroll}
      bounces={!lockScroll}
      contentContainerStyle={[fillContent.grow, contentContainerStyle]}
      data={data}
      onMomentumScrollBegin={handleMomentumScrollBegin}
      onMomentumScrollEnd={handleMomentumScrollEnd}
      onScrollBeginDrag={handleScrollBeginDrag}
      onScrollEndDrag={handleScrollEndDrag}
      overScrollMode={lockScroll ? 'never' : 'auto'}
      ref={ref}
      refreshControl={lockScroll ? undefined : refreshControl}
      removeClippedSubviews={LIST_REMOVE_CLIPPED_SUBVIEWS}
      scrollEnabled={!lockScroll}
    />
  );
}

/**
 * FlatList that locks scroll when `data` is empty and `ListEmptyComponent` is a fill state.
 * Pass `ListEmptyComponent={null}` when the empty UI lives in the header or footer and the list
 * should still scroll (filter-no-matches, detail screens whose chrome is the header).
 *
 * Supplies render-window defaults (`windowSize`, `initialNumToRender`, `maxToRenderPerBatch`,
 * `updateCellsBatchingPeriod`) that a caller may override.
 *
 * The alias keeps the generic `ItemT` on the public type — `forwardRef` otherwise widens it away.
 */
export const FillList = forwardRef(FillListInner) as <ItemT>(
  props: FillListProps<ItemT> & { ref?: Ref<FlatList<ItemT>> }
) => ReactElement;
