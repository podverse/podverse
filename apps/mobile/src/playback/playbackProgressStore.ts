/**
 * Mutable playhead store. The native engine writes here at ~2 Hz; leaf UI reads via
 * `useSyncExternalStore` so the session provider never re-renders on every tick.
 */

export type PlaybackProgressSnapshot = {
  durationSeconds: number;
  positionSeconds: number;
};

type Listener = () => void;

let snapshot: PlaybackProgressSnapshot = {
  durationSeconds: 0,
  positionSeconds: 0,
};

const listeners = new Set<Listener>();

const emit = (): void => {
  listeners.forEach((listener) => {
    listener();
  });
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
    return;
  }
  snapshot = next;
  emit();
};

export const setPlaybackPositionSeconds = (positionSeconds: number): void => {
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

export const resetPlaybackProgress = (): void => {
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
