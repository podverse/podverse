import { describe, expect, it } from 'vitest';

import {
  accumulateFrameGaps,
  emptyFrameGapStats,
  formatFrameGapDetail,
  parseFrameGapDetail,
} from './frameStats';

describe('accumulateFrameGaps', () => {
  it('counts frames and over-budget gaps', () => {
    const stats = accumulateFrameGaps([16, 18, 40, 10]);
    expect(stats.frameCount).toBe(4);
    expect(stats.over17Ms).toBe(2);
    expect(stats.over33Ms).toBe(1);
    expect(stats.maxGapMs).toBe(40);
  });

  it('ignores negative and non-finite gaps', () => {
    const stats = accumulateFrameGaps([-1, Number.NaN, 20]);
    expect(stats.frameCount).toBe(1);
    expect(stats.over17Ms).toBe(1);
  });
});

describe('frame gap detail codec', () => {
  it('round-trips through format and parse', () => {
    const detail = formatFrameGapDetail({
      frameCount: 120,
      maxGapMs: 48.25,
      over17Ms: 40,
      over33Ms: 5,
    });
    expect(parseFrameGapDetail(detail)).toEqual({
      frameCount: 120,
      maxGapMs: 48.3,
      over17Ms: 40,
      over33Ms: 5,
    });
  });

  it('returns null for malformed detail', () => {
    expect(parseFrameGapDetail('nope')).toBeNull();
    expect(parseFrameGapDetail(undefined)).toBeNull();
  });

  it('starts from emptyFrameGapStats', () => {
    expect(emptyFrameGapStats()).toEqual({
      frameCount: 0,
      maxGapMs: 0,
      over17Ms: 0,
      over33Ms: 0,
    });
  });
});
