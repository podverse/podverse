import { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet } from 'react-native';

import {
  consumeShareSheetPassthroughTap,
  isShareSheetPassthroughWindow,
  subscribeShareSheetPassthrough,
} from '../../lib/share/shareSheetPassthrough';

/**
 * Full-window swallow layer while a system share sheet is up. The OS sheet is another window,
 * so the tap that dismisses it would otherwise land on the app. That tap hides this layer in
 * the same press; the next tap reaches the title bar and the rest of the chrome.
 */
export function ShareSheetPassthroughOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let showing = false;

    const show = () => {
      showing = true;
      setVisible(true);
    };

    const hide = () => {
      if (!showing) {
        return;
      }
      showing = false;
      setVisible(false);
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
      // Stay up until the app is active so the resume tap hits this layer, then hide.
      if (AppState.currentState !== 'active') {
        return;
      }
      hide();
    };

    const unsubSession = subscribeShareSheetPassthrough(sync);
    const appSub = AppState.addEventListener('change', sync);
    return () => {
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
        consumeShareSheetPassthroughTap();
        setVisible(false);
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
