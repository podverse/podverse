import type { FlatListProps } from 'react-native';
import { FlatList, StyleSheet } from 'react-native';

type LockedScrollProps = 'alwaysBounceVertical' | 'bounces' | 'overScrollMode' | 'scrollEnabled';

export type FillListProps<ItemT> = Omit<FlatListProps<ItemT>, LockedScrollProps>;

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

  return listEmpty !== null && listEmpty !== undefined && listEmpty !== false;
}

const fillContent = StyleSheet.create({
  grow: {
    flexGrow: 1,
  },
});

/**
 * FlatList that locks scroll when `data` is empty and `ListEmptyComponent` is a fill state.
 * Pass `ListEmptyComponent={null}` when the empty UI lives in the header and the list should
 * still scroll (filter-no-matches).
 */
export function FillList<ItemT>({
  ListEmptyComponent,
  contentContainerStyle,
  data,
  refreshControl,
  ...rest
}: FillListProps<ItemT>) {
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
      refreshControl={lockScroll ? undefined : refreshControl}
      scrollEnabled={!lockScroll}
    />
  );
}
