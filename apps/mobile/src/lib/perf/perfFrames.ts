import { getPodversePerfProbeModule } from '../../../modules/podverse-perf-probe';
import type { FrameProbeSnapshot } from '../../../modules/podverse-perf-probe';

import { isMobileE2eFromEnv } from '../../config/e2eEnv';
import { isMobilePerfEnabledFromEnv } from '../../config/perfEnv';
import { accumulateFrameGaps, emptyFrameGapStats, formatFrameGapDetail } from './frameStats';
import type { FrameGapStats } from './frameStats';
import { perfMark } from './perfSpans';

const isRecording = isMobileE2eFromEnv() || isMobilePerfEnabledFromEnv();

const snapshotFromNative = (raw: FrameProbeSnapshot): FrameGapStats => ({
  frameCount: raw.frameCount,
  maxGapMs: raw.maxGapMs,
  over17Ms: raw.over17Ms,
  over33Ms: raw.over33Ms,
});

type RafSampler = {
  handle: number | null;
  lastTs: number | null;
  stats: FrameGapStats;
};

const createRafSampler = (): RafSampler => ({
  handle: null,
  lastTs: null,
  stats: emptyFrameGapStats(),
});

const tickSampler = (sampler: RafSampler, timestamp: number): void => {
  if (sampler.lastTs !== null) {
    sampler.stats = accumulateFrameGaps([timestamp - sampler.lastTs], sampler.stats);
  }
  sampler.lastTs = timestamp;
  sampler.handle = requestAnimationFrame((next) => {
    tickSampler(sampler, next);
  });
};

const startSampler = (sampler: RafSampler): void => {
  if (sampler.handle !== null) {
    return;
  }
  sampler.lastTs = null;
  sampler.stats = emptyFrameGapStats();
  sampler.handle = requestAnimationFrame((timestamp) => {
    tickSampler(sampler, timestamp);
  });
};

const stopSampler = (sampler: RafSampler): FrameGapStats => {
  if (sampler.handle !== null) {
    cancelAnimationFrame(sampler.handle);
    sampler.handle = null;
  }
  const result = sampler.stats;
  sampler.lastTs = null;
  sampler.stats = emptyFrameGapStats();
  return result;
};

const scrollSampler = createRafSampler();
const chipSampler = createRafSampler();
let scrollSessionDepth = 0;
let chipSampleOpen = false;
let chipOwnsProbe = false;

/**
 * Begin a scroll/fling sample window. Nested begin/end pairs share one window (FillList fires both
 * begin and end drag/momentum). Records `scroll.jsframes` and `scroll.uiframes` on the outermost end.
 */
export const beginPerfScrollSample = (): void => {
  if (!isRecording) {
    return;
  }
  scrollSessionDepth += 1;
  if (scrollSessionDepth !== 1) {
    return;
  }
  if (chipOwnsProbe) {
    chipOwnsProbe = false;
  }
  const probe = getPodversePerfProbeModule();
  if (probe !== null) {
    probe.reset();
    probe.start();
  }
  startSampler(scrollSampler);
};

export const endPerfScrollSample = (): void => {
  if (!isRecording) {
    return;
  }
  if (scrollSessionDepth === 0) {
    return;
  }
  scrollSessionDepth -= 1;
  if (scrollSessionDepth !== 0) {
    return;
  }
  const js = stopSampler(scrollSampler);
  perfMark('scroll.jsframes', formatFrameGapDetail(js));

  const probe = getPodversePerfProbeModule();
  if (probe !== null) {
    probe.stop();
    const ui = snapshotFromNative(probe.snapshot());
    perfMark('scroll.uiframes', formatFrameGapDetail(ui));
  }
};

const finishChipSample = (): void => {
  if (!chipSampleOpen) {
    return;
  }
  chipSampleOpen = false;
  const js = stopSampler(chipSampler);
  perfMark('chip.jsframes', formatFrameGapDetail(js));
  if (!chipOwnsProbe) {
    return;
  }
  chipOwnsProbe = false;
  const probe = getPodversePerfProbeModule();
  if (probe === null) {
    return;
  }
  probe.stop();
  const ui = snapshotFromNative(probe.snapshot());
  perfMark('chip.uiframes', formatFrameGapDetail(ui));
};

/**
 * Frame window for one chip switch. Starts at the tap and closes on the new rows' frame, or when
 * the next tap starts. `chip.jsframes` is the JS thread. `chip.uiframes` is the native probe when
 * that module is linked.
 */
export const beginPerfChipSample = (): void => {
  if (!isRecording) {
    return;
  }
  if (chipSampleOpen) {
    finishChipSample();
  }
  chipSampleOpen = true;
  startSampler(chipSampler);
  if (scrollSessionDepth !== 0) {
    return;
  }
  const probe = getPodversePerfProbeModule();
  if (probe === null) {
    return;
  }
  probe.reset();
  probe.start();
  chipOwnsProbe = true;
};

export const endPerfChipSample = (): void => {
  if (!isRecording) {
    return;
  }
  finishChipSample();
};

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
