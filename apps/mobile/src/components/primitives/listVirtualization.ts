import { LogBox } from 'react-native';

/**
 * Pass this for `removeClippedSubviews` on an Android `FlatList` that lives in a
 * `react-native-screens` stack card.
 *
 * `FlatList` is the only list that defaults the prop to true, and only on Android
 * (`removeClippedSubviewsOrDefault` → `Platform.OS === 'android'`). Passing `false` is a real
 * change there and a no-op on iOS, where the default is already false.
 *
 * A clipping view group on Android detaches offscreen children without telling Fabric.
 * `react-native-screens` inserts placeholder children during a screen-removal transition, which
 * shifts the child indices Fabric is about to mount against. The next mount batch reparents a view
 * that is still attached, throws `addViewAt: child already has a parent`, and tears down the React
 * host. Leaving clipping off keeps the native child list and the shadow tree in agreement.
 *
 * A `SectionList` does not need this: `VirtualizedList` never reads the prop and only spreads it to
 * `ScrollView`, whose native default is false. Overlay content does not need it either — an overlay
 * is never the screen being removed, so the crash cannot reach those lists.
 *
 * Virtualization itself is unaffected — rows outside the render window are still unmounted by
 * `windowSize` / `maxToRenderPerBatch`. Only the native detach of already-rendered offscreen rows
 * is given up.
 */
export const LIST_REMOVE_CLIPPED_SUBVIEWS = false;

/**
 * Rows kept mounted on each side of the viewport, expressed in viewport-heights.
 *
 * Lower means less to mount and less to tear down when a screen goes away; too low shows blank
 * space during a hard fling, because `LIST_REMOVE_CLIPPED_SUBVIEWS` is false and nothing is
 * pre-attached offscreen. Four screens in each direction leaves generous headroom while cutting
 * the mounted row count by more than half against the RN default of ten.
 */
export const LIST_WINDOW_SIZE = 9;

/** Rows in the first commit. Enough to fill a tall phone without a second pass. */
export const LIST_INITIAL_NUM_TO_RENDER = 8;

/** Rows added per batch while scrolling. Small batches keep each frame short. */
export const LIST_MAX_TO_RENDER_PER_BATCH = 8;

/** Milliseconds between batches. Leaves room for gesture handling between commits. */
export const LIST_UPDATE_CELLS_BATCHING_PERIOD = 50;

export type FillListRenderWindowProps = {
  initialNumToRender: number;
  maxToRenderPerBatch: number;
  updateCellsBatchingPeriod: number;
  windowSize: number;
};

/**
 * Render-window defaults, then caller props, so a list can override any of the four.
 * `FillList` spreads this onto `FlatList` before locked props.
 */
export function applyFillListRenderWindow<T extends object>(
  rest: T
): T & FillListRenderWindowProps {
  return {
    initialNumToRender: LIST_INITIAL_NUM_TO_RENDER,
    maxToRenderPerBatch: LIST_MAX_TO_RENDER_PER_BATCH,
    updateCellsBatchingPeriod: LIST_UPDATE_CELLS_BATCHING_PERIOD,
    windowSize: LIST_WINDOW_SIZE,
    ...rest,
  };
}

/**
 * RN fires a yellow box whenever a VirtualizedList is a descendant of a ScrollView. That check is
 * structural — it still fires when the parent slot has a fixed height and cannot expand the outer
 * column. The full player's outer ScrollView + height-locked inner FlatList is intentional product
 * nesting (see **mobile-player-fixed-region**). Call once from `FullPlayerScreen` so that banner
 * does not appear. Do not reuse this to silence other nesting; only the bounded pane sheet qualifies.
 */
export const ignoreFullPlayerBoundedNestedListWarning = (): void => {
  LogBox.ignoreLogs(['VirtualizedLists should never be nested']);
};
