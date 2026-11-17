import { useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HEADER_BAR_HEIGHT } from '../components/screen/HeaderBar';
import { isMobileE2eFromEnv } from '../config/env';
import { usePlaybackSession } from './PlaybackProvider';
import { getPlaybackSourceMarker, subscribePlaybackSourceMarker } from './playbackSourceMarker';

/**
 * E2E-only playback status markers above the root navigator. A slide-up card covers the tab
 * chrome, so these stay on top. The mini player has no distinct playing/paused
 * testID, so auto-queue and load-state flows read these while staying on product screens. Skip-next
 * and complete live on the More E2E Playback screen with the other harness controls.
 * `playback-source-e2e` is `remote` while streaming and `local` after a completed download of that
 * file is what the engine is playing.
 *
 * Each label is a header-row box with no painted content. A 1px box at the top of the window sits
 * under the status bar, and Android leaves it out of the accessibility tree. These match the
 * quick-login targets: full opacity, inset past the back control and a trailing header action,
 * and they do not receive touches.
 */
const MARKER_HEIGHT = 44;
const MARKER_WIDTH = 28;

export function PlaybackE2eStatus() {
  const { activeTarget, isPlaying, nowPlaying } = usePlaybackSession();
  const source = useSyncExternalStore(subscribePlaybackSourceMarker, getPlaybackSourceMarker);
  const insets = useSafeAreaInsets();

  if (!isMobileE2eFromEnv() || activeTarget === null) {
    return null;
  }

  const activeLabel = isPlaying ? 'playing' : 'paused';
  const titleLabel = nowPlaying?.title ?? '';

  return (
    <View collapsable={false} pointerEvents="none" style={[styles.host, { top: insets.top }]}>
      <View
        accessibilityLabel={activeLabel}
        accessible
        collapsable={false}
        importantForAccessibility="yes"
        style={styles.marker}
        testID="playback-active-e2e"
      />
      <View
        accessibilityLabel={titleLabel}
        accessible
        collapsable={false}
        importantForAccessibility="yes"
        style={styles.marker}
        testID="playback-now-playing-title-e2e"
      />
      {source !== null ? (
        <View
          accessibilityLabel={source}
          accessible
          collapsable={false}
          importantForAccessibility="yes"
          style={styles.marker}
          testID="playback-source-e2e"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flexDirection: 'row',
    height: MARKER_HEIGHT,
    position: 'absolute',
    right: HEADER_BAR_HEIGHT + 12,
    zIndex: 2000,
  },
  marker: {
    height: MARKER_HEIGHT,
    width: MARKER_WIDTH,
  },
});
