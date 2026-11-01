import type { ForwardedRef, ReactElement, ReactNode, Ref } from 'react';
import { createElement, forwardRef, Fragment, useCallback, useRef } from 'react';
import type { FlatListProps, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { FlatList, StyleSheet } from 'react-native';

import { beginPerfScrollSample, endPerfScrollSample } from '../../lib/perf/perfFrames';
import {
  BottomChromeScrollSpacer,
  useBottomChromeOverlayHeight,
} from '../../theme/bottomChromeOverlayInset';
import { applyFillListRenderWindow, LIST_REMOVE_CLIPPED_SUBVIEWS } from './listVirtualization';

/** Props `FillList` owns: scroll lock derives from the fill state, clipping is fixed app-wide. */
type LockedProps =
  'alwaysBounceVertical' | 'bounces' | 'overScrollMode' | 'removeClippedSubviews' | 'scrollEnabled';

/** Virtualized list slots reject `null`. Callers still pass it for "no slot". */
type ListSlotKey = 'ListEmptyComponent' | 'ListFooterComponent' | 'ListHeaderComponent';

type ListSlot<ItemT, Key extends ListSlotKey> = FlatListProps<ItemT>[Key] | null;

export type FillListProps<ItemT> = Omit<
  FlatListProps<ItemT>,
  LockedProps | 'ListEmptyComponent' | 'ListFooterComponent' | 'ListHeaderComponent'
> & {
  ListEmptyComponent?: ListSlot<ItemT, 'ListEmptyComponent'>;
  ListFooterComponent?: ListSlot<ItemT, 'ListFooterComponent'>;
  ListHeaderComponent?: ListSlot<ItemT, 'ListHeaderComponent'>;
};

/**
 * True when the list is showing a fill empty (loading, an empty message, or a call to action)
 * rather than rows. Those states have nothing to scroll, so bounce and pull stay off.
 */
export function isFillListScrollLocked(
  data: FlatListProps<unknown>['data'],
  listEmpty: FlatListProps<unknown>['ListEmptyComponent'] | null
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

function renderFillListFooter(footer: FillListProps<unknown>['ListFooterComponent']): ReactNode {
  if (footer === null || footer === undefined) {
    return null;
  }
  if (typeof footer === 'function') {
    return createElement(footer);
  }
  return footer;
}

function FillListInner<ItemT>(
  {
    ListEmptyComponent,
    ListFooterComponent,
    ListHeaderComponent,
    contentContainerStyle,
    data,
    onMomentumScrollBegin,
    onMomentumScrollEnd,
    onScrollBeginDrag,
    onScrollEndDrag,
    refreshControl,
    scrollIndicatorInsets,
    ...rest
  }: FillListProps<ItemT>,
  ref: ForwardedRef<FlatList<ItemT>>
): ReactElement {
  const overlayHeight = useBottomChromeOverlayHeight();
  const lockScroll = isFillListScrollLocked(data, ListEmptyComponent);
  // A locked fill centers in the scene. Padding that box would move the center when a bar appears.
  const scrollInset = lockScroll ? 0 : overlayHeight;
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

  const indicatorInsets =
    scrollInset > 0
      ? {
          ...scrollIndicatorInsets,
          bottom: (scrollIndicatorInsets?.bottom ?? 0) + scrollInset,
        }
      : scrollIndicatorInsets;

  const listFooter =
    scrollInset > 0 ? (
      <Fragment>
        {renderFillListFooter(ListFooterComponent)}
        <BottomChromeScrollSpacer />
      </Fragment>
    ) : (
      ListFooterComponent
    );

  return (
    <FlatList
      {...applyFillListRenderWindow(rest)}
      ListEmptyComponent={ListEmptyComponent === null ? undefined : ListEmptyComponent}
      ListFooterComponent={listFooter === null ? undefined : listFooter}
      ListHeaderComponent={ListHeaderComponent === null ? undefined : ListHeaderComponent}
      alwaysBounceVertical={!lockScroll}
      bounces={!lockScroll}
      contentContainerStyle={[lockScroll ? fillContent.grow : null, contentContainerStyle]}
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
      scrollIndicatorInsets={indicatorInsets}
    />
  );
}

/**
 * FlatList that locks scroll when `data` is empty and `ListEmptyComponent` is a fill state.
 * Pass `ListEmptyComponent={null}` when the empty UI lives in the header or footer and the list
 * should still scroll (filter-no-matches, detail screens whose chrome is the header). In that
 * case the content container does not grow, so a footer empty message sits under the chips
 * instead of centering over them.
 *
 * Supplies render-window defaults (`windowSize`, `initialNumToRender`, `maxToRenderPerBatch`,
 * `updateCellsBatchingPeriod`) that a caller may override.
 *
 * The alias keeps the generic `ItemT` on the public type — `forwardRef` otherwise widens it away.
 */
export const FillList = forwardRef(FillListInner) as <ItemT>(
  props: FillListProps<ItemT> & { ref?: Ref<FlatList<ItemT>> }
) => ReactElement;
