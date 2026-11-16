import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { isMobileE2eFromEnv } from '../../config/env';
import {
  getV4DownloadFixtureFilesMarker,
  subscribeV4DownloadFixtureFilesMarker,
} from './v4DownloadFixtureFilesCheck';

/**
 * E2E-only marker above the root navigator. `v4-download-fixture-files-e2e` lists planted
 * download file names still at the document root, or `none` once every planted name is gone.
 *
 * The node is a 1×1 absolute marker, same as the playback and perf markers. It does not receive
 * touches.
 */
export function V4DownloadFixtureFilesMarker() {
  const label = useSyncExternalStore(
    subscribeV4DownloadFixtureFilesMarker,
    getV4DownloadFixtureFilesMarker
  );

  if (!__DEV__ || !isMobileE2eFromEnv()) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.host}>
      <Text numberOfLines={1} style={styles.marker} testID="v4-download-fixture-files-e2e">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    height: 1,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    width: 1,
  },
  marker: {
    height: 1,
    width: 1,
  },
});
