import { describe, expect, it } from 'vitest';

import {
  MARQUEE_TAIL_GAP,
  marqueeScrollDistance,
  marqueeScrollDurationMs,
  shouldMarqueeScroll,
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

describe('marqueeScrollDistance', () => {
  it('travels the hidden overflow plus trailing air', () => {
    expect(marqueeScrollDistance(320, 180)).toBe(140 + MARQUEE_TAIL_GAP);
  });

  it('never travels backwards for a label that fits', () => {
    expect(marqueeScrollDistance(120, 180)).toBe(MARQUEE_TAIL_GAP);
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
