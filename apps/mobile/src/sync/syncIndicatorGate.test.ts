import { describe, expect, it } from 'vitest';

import {
  createSyncIndicatorGateState,
  reduceSyncIndicatorGate,
  SYNC_INDICATOR_MIN_VISIBLE_MS,
  SYNC_INDICATOR_SHOW_DELAY_MS,
} from './syncIndicatorGate';

describe('reduceSyncIndicatorGate', () => {
  it('stays hidden when the run finishes inside the show delay', () => {
    const waiting = reduceSyncIndicatorGate(createSyncIndicatorGateState(), { due: true, now: 0 });

    expect(waiting.state.visible).toBe(false);
    expect(waiting.wakeAt).toBe(SYNC_INDICATOR_SHOW_DELAY_MS);

    const finished = reduceSyncIndicatorGate(waiting.state, {
      due: false,
      now: SYNC_INDICATOR_SHOW_DELAY_MS - 1,
    });

    expect(finished.state.visible).toBe(false);
    expect(finished.wakeAt).toBeNull();
  });

  it('shows once the run is still due at the end of the delay', () => {
    const waiting = reduceSyncIndicatorGate(createSyncIndicatorGateState(), { due: true, now: 0 });
    const shown = reduceSyncIndicatorGate(waiting.state, {
      due: true,
      now: SYNC_INDICATOR_SHOW_DELAY_MS,
    });

    expect(shown.state.visible).toBe(true);
    expect(shown.state.shownAt).toBe(SYNC_INDICATOR_SHOW_DELAY_MS);
    expect(shown.wakeAt).toBeNull();
  });

  it('keeps the original start when due is reported again before it shows', () => {
    const waiting = reduceSyncIndicatorGate(createSyncIndicatorGateState(), { due: true, now: 0 });
    const again = reduceSyncIndicatorGate(waiting.state, { due: true, now: 250 });

    expect(again.state.visible).toBe(false);
    expect(again.state.dueAt).toBe(0);
    expect(again.wakeAt).toBe(SYNC_INDICATOR_SHOW_DELAY_MS);
  });

  it('hides only after the minimum visible time', () => {
    const waiting = reduceSyncIndicatorGate(createSyncIndicatorGateState(), { due: true, now: 0 });
    const shown = reduceSyncIndicatorGate(waiting.state, {
      due: true,
      now: SYNC_INDICATOR_SHOW_DELAY_MS,
    });
    const shownAt = shown.state.shownAt ?? 0;
    const holding = reduceSyncIndicatorGate(shown.state, {
      due: false,
      now: shownAt + SYNC_INDICATOR_MIN_VISIBLE_MS - 1,
    });

    expect(holding.state.visible).toBe(true);
    expect(holding.wakeAt).toBe(shownAt + SYNC_INDICATOR_MIN_VISIBLE_MS);

    const hidden = reduceSyncIndicatorGate(holding.state, {
      due: false,
      now: shownAt + SYNC_INDICATOR_MIN_VISIBLE_MS,
    });

    expect(hidden.state.visible).toBe(false);
    expect(hidden.wakeAt).toBeNull();
  });

  it('stays visible when a new run starts during the hold', () => {
    const waiting = reduceSyncIndicatorGate(createSyncIndicatorGateState(), { due: true, now: 0 });
    const shown = reduceSyncIndicatorGate(waiting.state, {
      due: true,
      now: SYNC_INDICATOR_SHOW_DELAY_MS,
    });
    const holding = reduceSyncIndicatorGate(shown.state, {
      due: false,
      now: (shown.state.shownAt ?? 0) + 100,
    });
    const resumed = reduceSyncIndicatorGate(holding.state, {
      due: true,
      now: (shown.state.shownAt ?? 0) + 200,
    });

    expect(resumed.state.visible).toBe(true);
    expect(resumed.wakeAt).toBeNull();
  });
});
