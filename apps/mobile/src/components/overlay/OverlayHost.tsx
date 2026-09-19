import type { PropsWithChildren } from 'react';
import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';

import type { OverlayStore } from './overlayStore';
import { createOverlayStore } from './overlayStore';

/**
 * Host for every app-owned overlay — dialogs, action sheets, viewers — so none of them needs an RN
 * `Modal`.
 *
 * A `Modal` is a second native window, and on Android its size reaches the shadow tree as an
 * asynchronous state update. When that update does not arrive, the root React gives the modal stays
 * 0×0: the content still paints (nothing clips it) but every descendant reports an empty visible
 * rect, so the platform drops the whole subtree from the accessibility tree. The dialog is on screen
 * and unreachable by TalkBack, VoiceOver, and UI automation at the same time — a failure no layout
 * fix inside the overlay can reach, because the collapsed view belongs to `Modal` itself.
 *
 * Overlays hosted here are laid out by the same tree that laid out the screen behind them, so there
 * is no window, no size round-trip, and one code path on both platforms.
 *
 * Two pieces have to be placed correctly for this to hold:
 * - `OverlayOutlet` renders after the navigator, so overlays cover native stack cards.
 * - `OverlayA11yShield` wraps the content overlays cover, so screen-reader focus cannot wander
 *   behind an open overlay. A closing overlay is already out of that tree, so the shield releases
 *   the app as soon as the dismissal is accepted.
 */
const OverlayStoreContext = createContext<OverlayStore | undefined>(undefined);

export function OverlayHostProvider({ children }: PropsWithChildren) {
  const store = useMemo(() => createOverlayStore(), []);

  return <OverlayStoreContext.Provider value={store}>{children}</OverlayStoreContext.Provider>;
}

export const useOverlayStore = (): OverlayStore => {
  const store = useContext(OverlayStoreContext);

  if (store === undefined) {
    throw new Error('Overlay components must be used within OverlayHostProvider');
  }

  return store;
};

const useOverlayEntries = () => {
  const store = useOverlayStore();

  return useSyncExternalStore(store.subscribe, store.getEntries);
};

export function OverlayOutlet() {
  const entries = useOverlayEntries();

  if (entries.length === 0) {
    return null;
  }

  return (
    // The outlet is the one handle that survives an open overlay: `OverlayA11yShield` takes the
    // rest of the app out of the accessibility tree, so "an overlay owns the screen" and "the app
    // has not rendered yet" look identical from outside without it.
    <View style={styles.outlet} testID="app-overlay-outlet">
      {entries.map((entry) => (
        <View
          accessibilityElementsHidden={entry.closing}
          importantForAccessibility={entry.closing ? 'no-hide-descendants' : 'auto'}
          key={entry.id}
          pointerEvents={entry.closing ? 'none' : 'auto'}
          style={styles.layer}
        >
          {entry.node}
        </View>
      ))}
    </View>
  );
}

/**
 * Wraps the app content an overlay covers. Screen readers treat the content as absent while any
 * overlay that is not closing is open, which is the containment a modal window used to provide.
 *
 * `children` is passed through untouched, so the subtree it describes does not re-render when an
 * overlay opens or closes.
 */
export function OverlayA11yShield({ children }: PropsWithChildren) {
  const hasOverlay = useOverlayEntries().some((entry) => !entry.closing);

  return (
    <View
      accessibilityElementsHidden={hasOverlay}
      importantForAccessibility={hasOverlay ? 'no-hide-descendants' : 'auto'}
      style={styles.shield}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  outlet: {
    ...StyleSheet.absoluteFillObject,
  },
  shield: {
    flex: 1,
  },
});
