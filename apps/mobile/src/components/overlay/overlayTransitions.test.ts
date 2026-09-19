import { describe, expect, it } from 'vitest';

import type { OverlayTransitionKind } from './overlayTransitions';
import {
  OVERLAY_TRANSITION_ENTER_MS,
  OVERLAY_TRANSITION_EXIT_MS,
  resolveOverlayTransitionDurations,
} from './overlayTransitions';

const KINDS: readonly OverlayTransitionKind[] = ['fade', 'none', 'slide'];

describe('resolveOverlayTransitionDurations', () => {
  it('returns the enter and exit constants for fade', () => {
    expect(resolveOverlayTransitionDurations({ kind: 'fade', reduceMotion: false })).toEqual({
      enterMs: OVERLAY_TRANSITION_ENTER_MS,
      exitMs: OVERLAY_TRANSITION_EXIT_MS,
    });
  });

  it('returns the enter and exit constants for slide', () => {
    expect(resolveOverlayTransitionDurations({ kind: 'slide', reduceMotion: false })).toEqual({
      enterMs: OVERLAY_TRANSITION_ENTER_MS,
      exitMs: OVERLAY_TRANSITION_EXIT_MS,
    });
  });

  it('returns zeros for none', () => {
    expect(resolveOverlayTransitionDurations({ kind: 'none', reduceMotion: false })).toEqual({
      enterMs: 0,
      exitMs: 0,
    });
  });

  it.each(KINDS)('returns zeros under reduce-motion for %s', (kind) => {
    expect(resolveOverlayTransitionDurations({ kind, reduceMotion: true })).toEqual({
      enterMs: 0,
      exitMs: 0,
    });
  });
});
