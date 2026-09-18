import { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet } from 'react-native';

import {
  isShareSheetPassthroughWindow,
  SHARE_DISMISS_TAP_GUARD_MS,
  subscribeShareSheetPassthrough,
} from '../../lib/share/shareSheetPassthrough';

/**
 * Full-window swallow layer while a system share sheet is up and for a beat after the app is
 * interactive again. The OS sheet is another window, so this only eats the tap that would
 * otherwise land on the app (artwork, transport, chips) on iOS and Android.
 */
export function ShareSheetPassthroughOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let releaseTimer: ReturnType<typeof setTimeout> | null = null;
    let showing = false;

    const clearReleaseTimer = () => {
      if (releaseTimer !== null) {
        clearTimeout(releaseTimer);
        releaseTimer = null;
      }
    };

    const show = () => {
      clearReleaseTimer();
      if (!showing) {
        showing = true;
        setVisible(true);
      }
    };

    const scheduleHide = () => {
      if (releaseTimer !== null) {
        return;
      }
      releaseTimer = setTimeout(() => {
        releaseTimer = null;
        showing = false;
        setVisible(false);
      }, SHARE_DISMISS_TAP_GUARD_MS);
    };

    const sync = () => {
      if (isShareSheetPassthroughWindow()) {
        show();
        return;
      }
      if (!showing) {
        return;
      }
      // Android's chooser often backgrounds the activity and resolves Share.share() early.
      // Stay up until the app is active again so the resume/dismiss tap hits this layer.
      if (AppState.currentState !== 'active') {
        return;
      }
      scheduleHide();
    };

    const unsubSession = subscribeShareSheetPassthrough(sync);
    const appSub = AppState.addEventListener('change', sync);
    return () => {
      clearReleaseTimer();
      unsubSession();
      appSub.remove();
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <Pressable
      accessible={false}
      importantForAccessibility="no"
      onPress={() => {
        // Swallow the dismiss-backdrop tap.
      }}
      style={styles.overlay}
      testID="share-sheet-passthrough-overlay"
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
  },
});
