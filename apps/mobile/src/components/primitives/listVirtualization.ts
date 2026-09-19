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
