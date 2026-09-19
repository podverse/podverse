import type { ForwardedRef, ReactElement, Ref } from 'react';
import { forwardRef } from 'react';
import type { FlatListProps } from 'react-native';
import { FlatList, StyleSheet } from 'react-native';

import { LIST_REMOVE_CLIPPED_SUBVIEWS } from './listVirtualization';

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
    refreshControl,
    ...rest
  }: FillListProps<ItemT>,
  ref: ForwardedRef<FlatList<ItemT>>
): ReactElement {
  const lockScroll = isFillListScrollLocked(data, ListEmptyComponent);

  return (
    <FlatList
      {...rest}
      ListEmptyComponent={ListEmptyComponent}
      alwaysBounceVertical={!lockScroll}
      bounces={!lockScroll}
      contentContainerStyle={[fillContent.grow, contentContainerStyle]}
      data={data}
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
 * The alias keeps the generic `ItemT` on the public type — `forwardRef` otherwise widens it away.
 */
export const FillList = forwardRef(FillListInner) as <ItemT>(
  props: FillListProps<ItemT> & { ref?: Ref<FlatList<ItemT>> }
) => ReactElement;
