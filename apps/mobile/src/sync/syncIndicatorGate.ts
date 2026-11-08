/**
 * When the sync progress row may paint.
 *
 * A run that finishes inside the show delay never appears. Once it appears, it stays through the
 * minimum so it cannot blink off. The clock is injected so a test can step time without timers.
 */

export const SYNC_INDICATOR_SHOW_DELAY_MS = 400;
export const SYNC_INDICATOR_MIN_VISIBLE_MS = 500;

export type SyncIndicatorGateState = {
  /** When the current run became due, while it is waiting to appear. */
  dueAt: number | null;
  /** When the row appeared, while it is visible. */
  shownAt: number | null;
  visible: boolean;
};

export type SyncIndicatorGateStep = {
  state: SyncIndicatorGateState;
  /** Absolute time to re-evaluate, or null when nothing is pending. */
  wakeAt: number | null;
};

export const createSyncIndicatorGateState = (): SyncIndicatorGateState => ({
  dueAt: null,
  shownAt: null,
  visible: false,
});

export const reduceSyncIndicatorGate = (
  state: SyncIndicatorGateState,
  input: { due: boolean; now: number }
): SyncIndicatorGateStep => {
  const { due, now } = input;

  if (due) {
    if (state.visible) {
      return {
        state: { dueAt: null, shownAt: state.shownAt, visible: true },
        wakeAt: null,
      };
    }

    const dueAt = state.dueAt ?? now;
    const showAt = dueAt + SYNC_INDICATOR_SHOW_DELAY_MS;
    if (now >= showAt) {
      return {
        state: { dueAt: null, shownAt: now, visible: true },
        wakeAt: null,
      };
    }

    return {
      state: { dueAt, shownAt: null, visible: false },
      wakeAt: showAt,
    };
  }

  if (!state.visible) {
    return {
      state: createSyncIndicatorGateState(),
      wakeAt: null,
    };
  }

  const shownAt = state.shownAt ?? now;
  const hideAt = shownAt + SYNC_INDICATOR_MIN_VISIBLE_MS;
  if (now >= hideAt) {
    return {
      state: createSyncIndicatorGateState(),
      wakeAt: null,
    };
  }

  return {
    state: { dueAt: null, shownAt, visible: true },
    wakeAt: hideAt,
  };
};
