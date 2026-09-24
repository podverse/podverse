import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { isMobileE2eFromEnv } from '../../config/e2eEnv';
import { getPerfTimeline, subscribePerfTimeline } from './perfSpans';

// Maestro is the only reader of this node, so manual perf builds skip it and its re-renders.
const isE2e = isMobileE2eFromEnv();

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

function PerfE2eStatus() {
  const timeline = useSyncExternalStore(subscribePerfTimeline, getPerfTimeline);
  const markCount = timeline.marks.length;
  const counterCount = Object.keys(timeline.counters).length;
  return (
    <View pointerEvents="none" style={styles.report} testID="perf-report-e2e">
      <Text numberOfLines={1} style={styles.status}>{`${markCount}/${counterCount}`}</Text>
    </View>
  );
}

/**
 * Proof the perf harness is mounted in E2E builds. Maestro asserts `perf-report-e2e`. The timeline
 * travels on the device log (`flushPerfTimeline`); this node is a 1×1 absolute status
 * (`markCount/counterCount`) so it cannot take space in the tab bar.
 */
export function PerfE2eReport() {
  if (!isE2e) {
    return null;
  }
  return <PerfE2eStatus />;
}
