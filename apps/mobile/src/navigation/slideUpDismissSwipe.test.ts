import { describe, expect, it } from 'vitest';

import {
  shouldDismissSlideUpSwipe,
  slideUpDismissDragOffset,
  SLIDE_UP_DISMISS_DISTANCE,
  SLIDE_UP_DISMISS_VELOCITY,
} from './slideUpDismissSwipe';

describe('shouldDismissSlideUpSwipe', () => {
  it('dismisses at the distance boundary', () => {
    expect(
      shouldDismissSlideUpSwipe({ translationY: SLIDE_UP_DISMISS_DISTANCE, velocityY: 0 })
    ).toBe(true);
  });

  it('does not dismiss just short of both thresholds', () => {
    expect(
      shouldDismissSlideUpSwipe({
        translationY: SLIDE_UP_DISMISS_DISTANCE - 1,
        velocityY: SLIDE_UP_DISMISS_VELOCITY - 1,
      })
    ).toBe(false);
  });

  it('dismisses a short drag at the velocity boundary', () => {
    expect(
      shouldDismissSlideUpSwipe({ translationY: 12, velocityY: SLIDE_UP_DISMISS_VELOCITY })
    ).toBe(true);
  });

  it('does not dismiss just under the velocity boundary', () => {
    expect(
      shouldDismissSlideUpSwipe({
        translationY: 12,
        velocityY: SLIDE_UP_DISMISS_VELOCITY - 1,
      })
    ).toBe(false);
  });

  it('does not dismiss an upward release even when the flick is fast downward', () => {
    expect(
      shouldDismissSlideUpSwipe({
        translationY: -8,
        velocityY: SLIDE_UP_DISMISS_VELOCITY,
      })
    ).toBe(false);
  });

  it('does not dismiss a resting finger', () => {
    expect(shouldDismissSlideUpSwipe({ translationY: 0, velocityY: 0 })).toBe(false);
  });

  it('dismisses a long downward drag', () => {
    expect(shouldDismissSlideUpSwipe({ translationY: 240, velocityY: 0 })).toBe(true);
  });

  it('does not dismiss a non-finite translation or velocity', () => {
    expect(shouldDismissSlideUpSwipe({ translationY: Number.NaN, velocityY: 0 })).toBe(false);
    expect(shouldDismissSlideUpSwipe({ translationY: 200, velocityY: Number.POSITIVE_INFINITY })).toBe(
      false
    );
  });
});

describe('slideUpDismissDragOffset', () => {
  it('copies a downward translation', () => {
    expect(slideUpDismissDragOffset(40)).toBe(40);
  });

  it('clamps upward motion to rest', () => {
    expect(slideUpDismissDragOffset(-12)).toBe(0);
  });

  it('returns rest for non-finite input', () => {
    expect(slideUpDismissDragOffset(Number.NaN)).toBe(0);
  });
});
