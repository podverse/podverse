import { getPodversePerfProbeModule } from '../../../modules/podverse-perf-probe';

import { isMobileE2eFromEnv } from '../../config/e2eEnv';
import { isMobilePerfEnabledFromEnv } from '../../config/perfEnv';

export const PERF_LOG_TAG = 'PODVERSE_PERF';

// Room for a cold start plus a 12-tap gesture, including session UI-stall marks.
export const PERF_MARK_CAP = 1000;

/**
 * One clock for the whole timeline. `performance.now` is relative to an arbitrary origin and
 * `Date.now` is epoch, so a timeline that mixed them would produce deltas that are silently wrong.
 */
const nowMs: () => number =
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? () => performance.now()
    : () => Date.now();

// Off unless the E2E harness or the dev perf flag is set, read once at load. Call sites keep
// their marks unconditionally; this is what leaves them inert in a normal or production build.
const isRecording = isMobileE2eFromEnv() || isMobilePerfEnabledFromEnv();

export type PerfMark = {
  at: number;
  counters: Record<string, number>;
  detail?: string;
  name: string;
};

export type PerfTimeline = { counters: Record<string, number>; marks: PerfMark[] };

const EMPTY_TIMELINE: PerfTimeline = { counters: {}, marks: [] };

const IDLE_FLUSH_MS = 1500;

// Each flush is several tagged lines the report joins. Android logcat keeps about 4KB of one
// ReactNativeJS line. The iOS unified log keeps about 1KB of one line and stores an ellipsis
// in place of the rest, so a slice has to fit in that smaller line with the tag and n/m prefix.
const PERF_LOG_CHUNK_CHARS = 900;

let marks: PerfMark[] = [];
let counters: Record<string, number> = {};
let snapshot: PerfTimeline = EMPTY_TIMELINE;
// Rebuilt on read, so recording a mark costs the same however full the buffer is.
let snapshotStale = false;
const listeners = new Set<() => void>();
let idleFlushTimer: ReturnType<typeof setTimeout> | undefined;

const clearIdleFlushTimer = (): void => {
  if (idleFlushTimer === undefined) {
    return;
  }
  clearTimeout(idleFlushTimer);
  idleFlushTimer = undefined;
};

const notify = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

// Listeners include a React store (`PerfE2eReport`). Marks and counts can run while another
// component is rendering, so the store update waits until that render finishes.
let notifyScheduled = false;

const scheduleNotify = (): void => {
  if (notifyScheduled) {
    return;
  }
  notifyScheduled = true;
  queueMicrotask(() => {
    notifyScheduled = false;
    notify();
  });
};

const publish = (): void => {
  snapshotStale = true;
  if (listeners.size > 0) {
    scheduleNotify();
  }
};

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

const writePerfLog = (): void => {
  const json = JSON.stringify(getPerfTimeline());
  const total = Math.max(1, Math.ceil(json.length / PERF_LOG_CHUNK_CHARS));
  for (let index = 0; index < total; index += 1) {
    const slice = json.slice(index * PERF_LOG_CHUNK_CHARS, (index + 1) * PERF_LOG_CHUNK_CHARS);
    writePerfLine(`${PERF_LOG_TAG} ${index + 1}/${total} ${slice}`);
  }
};

/** 1500 ms after the last mark, flush once; another mark starts the idle window again. */
const scheduleIdleFlush = (): void => {
  clearIdleFlushTimer();
  const timer = setTimeout(() => {
    idleFlushTimer = undefined;
    writePerfLog();
  }, IDLE_FLUSH_MS);
  if (typeof timer === 'object' && 'unref' in timer) {
    timer.unref();
  }
  idleFlushTimer = timer;
};

export const perfMark = (name: string, detail?: string): void => {
  if (!isRecording) {
    return;
  }
  if (marks.length === PERF_MARK_CAP) {
    marks.shift();
  }
  // Copied so a later perfCount cannot rewrite the counts this mark observed.
  const recorded: PerfMark = { at: nowMs(), counters: { ...counters }, name };
  if (detail !== undefined) {
    recorded.detail = detail;
  }
  marks.push(recorded);
  publish();
  scheduleIdleFlush();
};

/** Monotonic counters for things measured by frequency rather than duration, e.g. row mounts. */
export const perfCount = (name: string): void => {
  if (!isRecording) {
    return;
  }
  const current = counters[name];
  counters[name] = current === undefined ? 1 : current + 1;
  publish();
};

export const resetPerfTimeline = (): void => {
  if (!isRecording) {
    return;
  }
  clearIdleFlushTimer();
  marks = [];
  counters = {};
  snapshot = EMPTY_TIMELINE;
  snapshotStale = false;
  scheduleNotify();
};

export const getPerfTimeline = (): PerfTimeline => {
  if (snapshotStale) {
    snapshot = { counters: { ...counters }, marks: marks.slice() };
    snapshotStale = false;
  }
  return snapshot;
};

export const subscribePerfTimeline = (listener: () => void): (() => void) => {
  if (!isRecording) {
    return () => undefined;
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Write the timeline to the device log. The report script greps this tag, so the tag must not
 * appear in any other log call. Each line is `n/m` plus a slice short enough for one iOS unified-log line (about 1 KB); the
 * slices concatenate back into one JSON object.
 */
export const flushPerfTimeline = (): void => {
  if (!isRecording) {
    return;
  }
  clearIdleFlushTimer();
  writePerfLog();
};
