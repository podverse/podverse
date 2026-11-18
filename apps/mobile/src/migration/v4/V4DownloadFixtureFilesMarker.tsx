import { useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HEADER_BAR_HEIGHT } from '../../components/screen/HeaderBar';
import { isMobileE2eFromEnv } from '../../config/env';
import {
  getV4DownloadFixtureFilesMarker,
  subscribeV4DownloadFixtureFilesMarker,
} from './v4DownloadFixtureFilesCheck';

/**
 * E2E-only marker above the root navigator. `v4-download-fixture-files-e2e` lists planted
 * download file names still at the document root, or `none` once every planted name is gone.
 *
 * The box sits in the header row, just left of the playback status markers, and paints nothing.
 * A 1px box at the top of the window sits under the status bar, and Android leaves it out of the
 * accessibility tree. It does not receive touches.
 */
const MARKER_HEIGHT = 44;
const MARKER_WIDTH = 28;
/** Playback status is three boxes wide, then a gap, then this one. */
const PLAYBACK_MARKER_SLOTS = 3;

export function V4DownloadFixtureFilesMarker() {
  const label = useSyncExternalStore(
    subscribeV4DownloadFixtureFilesMarker,
    getV4DownloadFixtureFilesMarker
  );
  const insets = useSafeAreaInsets();

  if (!__DEV__ || !isMobileE2eFromEnv()) {
    return null;
  }

  return (
    <View
      accessibilityLabel={label}
      accessible
      collapsable={false}
      importantForAccessibility="yes"
      pointerEvents="none"
      style={[
        styles.marker,
        {
          right: HEADER_BAR_HEIGHT + 12 + MARKER_WIDTH * PLAYBACK_MARKER_SLOTS + 8,
          top: insets.top,
        },
      ]}
      testID="v4-download-fixture-files-e2e"
    />
  );
}

const styles = StyleSheet.create({
  marker: {
    height: MARKER_HEIGHT,
    position: 'absolute',
    width: MARKER_WIDTH,
    zIndex: 2000,
  },
});
