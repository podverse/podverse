import { describe, expect, it } from 'vitest';

import { spacing } from '../../theme/spacing';
import {
  MARQUEE_LOOP_GAP,
  marqueeLoopDistance,
  marqueeScrollDurationMs,
  shouldMarqueeScroll,
  stabilizeMeasuredWidth,
} from './marqueeScroll';

describe('shouldMarqueeScroll', () => {
  it('scrolls when the label is wider than the space it has', () => {
    expect(
      shouldMarqueeScroll({ contentWidth: 320, reduceMotion: false, viewportWidth: 180 })
    ).toBe(true);
  });

  it('stays still when the label fits', () => {
    expect(
      shouldMarqueeScroll({ contentWidth: 140, reduceMotion: false, viewportWidth: 180 })
    ).toBe(false);
  });

  it('ignores sub-pixel overflow from measurement rounding', () => {
    expect(
      shouldMarqueeScroll({ contentWidth: 180.4, reduceMotion: false, viewportWidth: 180 })
    ).toBe(false);
  });

  it('stays still under Reduce Motion even when it overflows', () => {
    expect(shouldMarqueeScroll({ contentWidth: 320, reduceMotion: true, viewportWidth: 180 })).toBe(
      false
    );
  });

  it('stays still before either width is measured', () => {
    expect(shouldMarqueeScroll({ contentWidth: 320, reduceMotion: false, viewportWidth: 0 })).toBe(
      false
    );
    expect(shouldMarqueeScroll({ contentWidth: 0, reduceMotion: false, viewportWidth: 180 })).toBe(
      false
    );
  });
});

describe('marqueeLoopDistance', () => {
  it('travels one copy plus the seam', () => {
    expect(marqueeLoopDistance(320)).toBe(320 + MARQUEE_LOOP_GAP);
  });

  it('keeps the seam wider than a word-sized gap', () => {
    expect(MARQUEE_LOOP_GAP).toBe(spacing['2xl']);
    expect(MARQUEE_LOOP_GAP).toBeGreaterThan(spacing.base);
  });
});

describe('stabilizeMeasuredWidth', () => {
  it('keeps the first real width', () => {
    expect(stabilizeMeasuredWidth(0, 348)).toBe(348);
  });

  it('ignores sub-pixel jitter that would restart a pass', () => {
    expect(stabilizeMeasuredWidth(348, 348.4)).toBe(348);
  });

  it('accepts a real resize of the bar', () => {
    expect(stabilizeMeasuredWidth(348, 280)).toBe(280);
  });
});

describe('marqueeScrollDurationMs', () => {
  it('holds one speed, so a longer title takes longer', () => {
    const shortPass = marqueeScrollDurationMs(50);
    const longPass = marqueeScrollDurationMs(200);
    expect(longPass).toBeGreaterThan(shortPass);
    expect(longPass / shortPass).toBeCloseTo(4, 1);
  });

  it('is zero when there is nothing to travel', () => {
    expect(marqueeScrollDurationMs(0)).toBe(0);
  });
});
