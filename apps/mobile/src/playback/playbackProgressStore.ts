/**
 * Mutable playhead store. Native progress writes samples here; while playing, a 1 Hz interpolator
 * advances the playhead from the last sample so clocks and fill keep moving even when the engine
 * is quiet (common after a seek). Leaf UI reads via `useSyncExternalStore` so the session provider
 * never re-renders on every tick.
 */

export type PlaybackProgressSnapshot = {
  durationSeconds: number;
  positionSeconds: number;
};

type Listener = () => void;

const PROGRESS_TICK_MS = 1000;

let snapshot: PlaybackProgressSnapshot = {
  durationSeconds: 0,
  positionSeconds: 0,
};

let playing = false;
let rate = 1;
let samplePosition = 0;
let sampleAtMs = 0;
let tickTimer: ReturnType<typeof setInterval> | null = null;

const listeners = new Set<Listener>();

const emit = (): void => {
  listeners.forEach((listener) => {
    listener();
  });
};

const clampToDuration = (positionSeconds: number): number => {
  const next = Math.max(0, positionSeconds);
  if (snapshot.durationSeconds > 0) {
    return Math.min(snapshot.durationSeconds, next);
  }
  return next;
};

const interpolatePosition = (): number => {
  if (!playing || sampleAtMs === 0) {
    return snapshot.positionSeconds;
  }
  const elapsedSeconds = ((Date.now() - sampleAtMs) / 1000) * rate;
  return clampToDuration(samplePosition + elapsedSeconds);
};

const noteSample = (positionSeconds: number): void => {
  samplePosition = positionSeconds;
  sampleAtMs = Date.now();
};

const stopTickTimer = (): void => {
  if (tickTimer === null) {
    return;
  }
  clearInterval(tickTimer);
  tickTimer = null;
};

const applyInterpolatedTick = (): void => {
  const next = interpolatePosition();
  if (next === snapshot.positionSeconds) {
    return;
  }
  snapshot = { ...snapshot, positionSeconds: next };
  emit();
};

const syncTickTimer = (): void => {
  if (!playing) {
    stopTickTimer();
    return;
  }
  if (tickTimer !== null) {
    return;
  }
  tickTimer = setInterval(applyInterpolatedTick, PROGRESS_TICK_MS);
};

export const getPlaybackProgressSnapshot = (): PlaybackProgressSnapshot => snapshot;

export const subscribePlaybackProgress = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const setPlaybackProgress = (next: PlaybackProgressSnapshot): void => {
  if (
    next.positionSeconds === snapshot.positionSeconds &&
    next.durationSeconds === snapshot.durationSeconds
  ) {
    noteSample(next.positionSeconds);
    return;
  }
  snapshot = next;
  noteSample(next.positionSeconds);
  emit();
};

export const setPlaybackPositionSeconds = (positionSeconds: number): void => {
  noteSample(positionSeconds);
  if (positionSeconds === snapshot.positionSeconds) {
    return;
  }
  snapshot = { ...snapshot, positionSeconds };
  emit();
};

export const setPlaybackDurationSeconds = (durationSeconds: number): void => {
  if (durationSeconds === snapshot.durationSeconds) {
    return;
  }
  snapshot = { ...snapshot, durationSeconds };
  emit();
};

export const setPlaybackProgressPlaying = (nextPlaying: boolean): void => {
  playing = nextPlaying;
  noteSample(snapshot.positionSeconds);
  syncTickTimer();
};

export const setPlaybackProgressRate = (nextRate: number): void => {
  if (!Number.isFinite(nextRate) || nextRate <= 0) {
    return;
  }
  samplePosition = interpolatePosition();
  sampleAtMs = Date.now();
  rate = nextRate;
};

export const resetPlaybackProgress = (): void => {
  playing = false;
  rate = 1;
  samplePosition = 0;
  sampleAtMs = 0;
  stopTickTimer();
  if (snapshot.positionSeconds === 0 && snapshot.durationSeconds === 0) {
    return;
  }
  snapshot = { durationSeconds: 0, positionSeconds: 0 };
  emit();
};

/** Whole-second position for clock labels so text only re-renders once per second. */
export const getPlaybackPositionClockSeconds = (): number => {
  return Math.floor(snapshot.positionSeconds);
};

export const subscribePlaybackPositionClock = (listener: Listener): (() => void) => {
  let lastClock = getPlaybackPositionClockSeconds();
  return subscribePlaybackProgress(() => {
    const nextClock = getPlaybackPositionClockSeconds();
    if (nextClock !== lastClock) {
      lastClock = nextClock;
      listener();
    }
  });
};

/** Duration only — re-renders when the media length changes, not on every playhead tick. */
export const getPlaybackDurationSeconds = (): number => snapshot.durationSeconds;

export const subscribePlaybackDuration = (listener: Listener): (() => void) => {
  let lastDuration = getPlaybackDurationSeconds();
  return subscribePlaybackProgress(() => {
    const nextDuration = getPlaybackDurationSeconds();
    if (nextDuration !== lastDuration) {
      lastDuration = nextDuration;
      listener();
    }
  });
};

export const getPlaybackProgressRatio = (): number => {
  if (snapshot.durationSeconds <= 0) {
    return 0;
  }
  const ratio = snapshot.positionSeconds / snapshot.durationSeconds;
  if (!Number.isFinite(ratio)) {
    return 0;
  }
  if (ratio < 0) {
    return 0;
  }
  if (ratio > 1) {
    return 1;
  }
  return ratio;
};
