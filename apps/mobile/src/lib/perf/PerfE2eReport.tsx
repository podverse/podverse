import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { isMobileE2eFromEnv } from '../../config/e2eEnv';
import { isMobilePerfEnabledFromEnv } from '../../config/perfEnv';
import { getPerfTimeline, subscribePerfTimeline } from './perfSpans';

// Same gate as the recorder, read once at load. A normal or production build renders nothing.
const isRecording = isMobileE2eFromEnv() || isMobilePerfEnabledFromEnv();

const styles = StyleSheet.create({
  report: {
    height: 1,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    width: 1,
  },
  status: {
    height: 1,
    width: 1,
  },
});

/**
 * Proof the perf harness is mounted when the E2E harness or the dev perf flag is on. Maestro
 * asserts `perf-report-e2e`. The timeline travels on the device log (`flushPerfTimeline`); this
 * node is a 1×1 absolute status (`markCount/counterCount`) so it cannot take space in the tab bar.
 */
export function PerfE2eReport() {
  const timeline = useSyncExternalStore(subscribePerfTimeline, getPerfTimeline);
  if (!isRecording) {
    return null;
  }
  const markCount = timeline.marks.length;
  const counterCount = Object.keys(timeline.counters).length;
  return (
    <View pointerEvents="none" style={styles.report} testID="perf-report-e2e">
      <Text numberOfLines={1} style={styles.status}>{`${markCount}/${counterCount}`}</Text>
    </View>
  );
}
