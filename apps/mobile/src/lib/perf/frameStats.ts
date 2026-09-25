export type FrameGapStats = {
  frameCount: number;
  maxGapMs: number;
  over17Ms: number;
  over33Ms: number;
};

export const emptyFrameGapStats = (): FrameGapStats => ({
  frameCount: 0,
  maxGapMs: 0,
  over17Ms: 0,
  over33Ms: 0,
});

/**
 * Pure gap aggregation used by the JS rAF sampler and by unit tests. Gaps are consecutive frame
 * arrival deltas in milliseconds.
 */
export const accumulateFrameGaps = (
  gapsMs: readonly number[],
  initial: FrameGapStats = emptyFrameGapStats()
): FrameGapStats => {
  let frameCount = initial.frameCount;
  let over17Ms = initial.over17Ms;
  let over33Ms = initial.over33Ms;
  let maxGapMs = initial.maxGapMs;
  for (const gapMs of gapsMs) {
    if (!Number.isFinite(gapMs) || gapMs < 0) {
      continue;
    }
    frameCount += 1;
    if (gapMs > maxGapMs) {
      maxGapMs = gapMs;
    }
    if (gapMs > 17) {
      over17Ms += 1;
    }
    if (gapMs > 33) {
      over33Ms += 1;
    }
  }
  return { frameCount, maxGapMs, over17Ms, over33Ms };
};

export const formatFrameGapDetail = (stats: FrameGapStats): string =>
  `count=${stats.frameCount},over17=${stats.over17Ms},over33=${stats.over33Ms},maxMs=${stats.maxGapMs.toFixed(1)}`;

export const parseFrameGapDetail = (detail: string | undefined): FrameGapStats | null => {
  if (detail === undefined || detail.length === 0) {
    return null;
  }
  const count = /(?:^|,)count=(\d+)(?:$|,)/.exec(detail);
  const over17 = /(?:^|,)over17=(\d+)(?:$|,)/.exec(detail);
  const over33 = /(?:^|,)over33=(\d+)(?:$|,)/.exec(detail);
  const maxMs = /(?:^|,)maxMs=([0-9.]+)(?:$|,)/.exec(detail);
  if (count === null || over17 === null || over33 === null || maxMs === null) {
    return null;
  }
  const frameCount = Number(count[1]);
  const over17Ms = Number(over17[1]);
  const over33Ms = Number(over33[1]);
  const maxGapMs = Number(maxMs[1]);
  if (
    !Number.isFinite(frameCount) ||
    !Number.isFinite(over17Ms) ||
    !Number.isFinite(over33Ms) ||
    !Number.isFinite(maxGapMs)
  ) {
    return null;
  }
  return { frameCount, maxGapMs, over17Ms, over33Ms };
};
