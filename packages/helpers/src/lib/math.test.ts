import { describe, expect, it } from 'vitest';

import { clampRatio } from './math.js';

describe('clampRatio', () => {
  it('preserves ratios within the inclusive range', () => {
    expect(clampRatio(0)).toBe(0);
    expect(clampRatio(0.5)).toBe(0.5);
    expect(clampRatio(1)).toBe(1);
  });

  it('clamps out-of-range and non-finite values', () => {
    expect(clampRatio(-1)).toBe(0);
    expect(clampRatio(Number.NaN)).toBe(0);
    expect(clampRatio(Number.POSITIVE_INFINITY)).toBe(0);
    expect(clampRatio(2)).toBe(1);
  });
});
