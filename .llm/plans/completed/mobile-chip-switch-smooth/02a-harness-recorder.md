# 02a — Harness recorder: stop distorting, start the UI monitor

## Goal

1. The harness stops loading the app it measures:
   - timeline lines go through the native `log` (os_log) instead of `console.warn` → LogBox;
   - the timeline snapshot is rebuilt only when read (a mark no longer copies the whole buffer);
   - the 1×1 status view (and its re-render per mark) exists only in E2E builds.
2. JS helpers for 02b: note a chip touch, stamp a frame, and drain session UI stalls into marks.
3. The session UI monitor starts at app load in perf and E2E builds.

## Preconditions

- 01a and 01b done; the operator rebuilt iOS. Every native call checks the function exists, so
  nothing breaks on an older build.

## Files

- `apps/mobile/src/lib/perf/perfSpans.ts`
- `apps/mobile/src/lib/perf/perfSpans.test.ts`
- `apps/mobile/src/lib/perf/perfFrames.ts`
- `apps/mobile/src/lib/perf/PerfE2eReport.tsx`
- `apps/mobile/App.tsx`
- `apps/mobile/src/lib/perf/frameStats.test.ts`

## Step 1 — `perfSpans.ts`

1a. Make the first line `import { getPodversePerfProbeModule } from '../../../modules/podverse-perf-probe';`
followed by one blank line, then the existing `isMobileE2eFromEnv` import.

1b. Replace `const PERF_MARK_CAP = 500;` with:

```ts
// Room for a cold start plus a 12-tap gesture, including session UI-stall marks.
export const PERF_MARK_CAP = 1000;
```

1c. After `let snapshot: PerfTimeline = EMPTY_TIMELINE;` add:

```ts
// Rebuilt on read, so recording a mark costs the same however full the buffer is.
let snapshotStale = false;
```

1d. Replace the whole `publish` function with:

```ts
const publish = (): void => {
  snapshotStale = true;
  if (listeners.size > 0) {
    scheduleNotify();
  }
};
```

1e. Directly above `const writePerfLog = (): void => {` add:

```ts
// The native probe writes through os_log / Log.i: no LogBox, no Metro forwarding, and the lines
// survive Release builds. console.log is the fallback when the probe is not linked.
const writePerfLine = (line: string): void => {
  const probe = getPodversePerfProbeModule();
  if (probe?.log !== undefined) {
    probe.log(line);
    return;
  }
  // eslint-disable-next-line no-console -- the report script reads these lines from the device log
  console.log(line);
};
```

Then inside `writePerfLog` replace `console.warn(` with `writePerfLine(`.

1f. In `resetPerfTimeline`, after `snapshot = EMPTY_TIMELINE;` add `snapshotStale = false;`.

1g. Replace `export const getPerfTimeline = (): PerfTimeline => snapshot;` with:

```ts
export const getPerfTimeline = (): PerfTimeline => {
  if (snapshotStale) {
    snapshot = { counters: { ...counters }, marks: marks.slice() };
    snapshotStale = false;
  }
  return snapshot;
};
```

1h. In the doc comment above `flushPerfTimeline`, replace `short enough for logcat` with
`short enough for one iOS unified-log line (about 1 KB)`.

## Step 2 — `perfSpans.test.ts`

2a. Replace the test titled `'caps the mark buffer at 500 and drops the oldest'` (the whole `it(…)`)
with:

```ts
  it('caps the mark buffer and drops the oldest', async () => {
    const { getPerfTimeline, PERF_MARK_CAP, perfMark } = await loadRecorder();

    for (let index = 0; index <= PERF_MARK_CAP; index += 1) {
      perfMark(`mark-${index}`);
    }

    const { marks } = getPerfTimeline();
    expect(marks).toHaveLength(PERF_MARK_CAP);
    expect(marks[0]?.name).toBe('mark-1');
    expect(marks[PERF_MARK_CAP - 1]?.name).toBe(`mark-${PERF_MARK_CAP}`);
  });
```

2b. In the test `'flushes a long timeline as short n/m lines that concatenate'`, change
`vi.spyOn(console, 'warn')` to `vi.spyOn(console, 'log')`. The native probe never loads in Node,
so the fallback path is what the test exercises.

## Step 3 — `perfFrames.ts`

Append at the end of the file:

```ts
const TOUCH_STAMP_WINDOW_MS = 5000;
const MAX_TOUCH_LAG_MS = 10000;
const UI_MONITOR_DRAIN_MS = 500;

let lastTouchMs: number | null = null;
let lastTouchNotedAt = 0;
const stampedTags = new Set<string>();

/**
 * Record the release time of a chip tap (`nativeEvent.timestamp`, native uptime ms). Frame stamps
 * that follow are measured from this moment. A timestamp on a different clock is marked
 * `clock=mismatch` and never stamped, so a wrong base cannot produce believable numbers.
 */
export const notePerfTouch = (touchMs: number): void => {
  if (!isRecording) {
    return;
  }
  lastTouchMs = null;
  stampedTags.clear();
  const nowUptime = getPodversePerfProbeModule()?.uptimeMs?.();
  if (nowUptime === undefined || !Number.isFinite(touchMs)) {
    return;
  }
  const lagMs = nowUptime - touchMs;
  if (lagMs < 0 || lagMs > MAX_TOUCH_LAG_MS) {
    perfMark('chip.touch', 'clock=mismatch');
    return;
  }
  lastTouchMs = touchMs;
  lastTouchNotedAt = Date.now();
  perfMark('chip.touch', `touchMs=${touchMs.toFixed(3)},lagMs=${lagMs.toFixed(1)}`);
};

/**
 * Ask the native monitor to time the next displayed frame against the last chip touch. Call from a
 * layout effect of the commit that first shows the thing `tag` names; each tag is stamped at most
 * once per touch.
 */
export const stampPerfFrame = (tag: string): void => {
  if (!isRecording || lastTouchMs === null || stampedTags.has(tag)) {
    return;
  }
  if (Date.now() - lastTouchNotedAt > TOUCH_STAMP_WINDOW_MS) {
    return;
  }
  const probe = getPodversePerfProbeModule();
  if (probe?.stampNextFrame === undefined) {
    return;
  }
  stampedTags.add(tag);
  probe.stampNextFrame(tag, lastTouchMs);
};

const drainUiMonitor = (): void => {
  const probe = getPodversePerfProbeModule();
  if (probe === null) {
    return;
  }
  for (const stamp of probe.drainFrameStamps?.() ?? []) {
    perfMark(stamp.tag, `touchMs=${stamp.touchMs.toFixed(3)},ms=${stamp.latencyMs.toFixed(1)}`);
  }
  for (const frame of probe.drainLongFrames?.() ?? []) {
    perfMark('ui.long', `gapMs=${frame.gapMs.toFixed(1)},agoMs=${frame.agoMs.toFixed(1)}`);
  }
};

let uiMonitorStarted = false;

/** Start the session-long UI-thread monitor once per process. Inert outside perf and E2E builds. */
export const startPerfUiMonitor = (): void => {
  if (!isRecording || uiMonitorStarted) {
    return;
  }
  const probe = getPodversePerfProbeModule();
  if (probe?.startSession === undefined) {
    return;
  }
  uiMonitorStarted = true;
  probe.startSession();
  setInterval(drainUiMonitor, UI_MONITOR_DRAIN_MS);
};
```

## Step 4 — `PerfE2eReport.tsx`

Replace the whole file with (the `styles` values are unchanged):

```tsx
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
```

## Step 5 — `App.tsx`

5a. Add `import { startPerfUiMonitor } from './src/lib/perf/perfFrames';` directly after the line
`import { E2eQuickLogin } from './src/lib/e2e/E2eQuickLogin';`.

5b. Directly above `export default function App() {` add these two lines (the call, then a blank):

```ts
startPerfUiMonitor();

```

## Step 6 — `frameStats.test.ts` imports

`apps/mobile/src/lib/perf/frameStats.test.ts` uses `describe`, `it`, and `expect` without
importing them (vitest globals are off, so type-check fails). Insert these two lines at the very
top of the file, above its first `import {` line:

```ts
import { describe, expect, it } from 'vitest';

```

## Do not

- Do not change `PERF_LOG_TAG` or its line; the report script parses that exact line.
- Do not remove any existing mark, counter, or `beginPerfChipSample` / `endPerfChipSample`.

## Done when

- [ ] Steps 1–6 applied; Prettier run on the six files.
- [ ] `rg -n "console.warn" apps/mobile/src/lib/perf` finds nothing.
- [ ] COPY-PASTA 02a ticked; this file moved to `.llm/plans/completed/mobile-chip-switch-smooth/`.

## Operator checkpoint

None yet. Paste prompt 02b next.
