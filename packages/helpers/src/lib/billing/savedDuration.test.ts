import { describe, expect, it } from 'vitest';

import { SECONDS_PER_DAY } from '../timeConstants.js';
import { savedDurationSegments, splitSavedDuration } from './savedDuration.js';

describe('splitSavedDuration', () => {
  it('splits years, 30-day months, and leftover days', () => {
    expect(splitSavedDuration((2 * 365 + 2 * 30 + 5) * SECONDS_PER_DAY)).toEqual({
      days: 5,
      months: 2,
      years: 2,
    });
    expect(splitSavedDuration(31 * SECONDS_PER_DAY)).toEqual({
      days: 1,
      months: 1,
      years: 0,
    });
    expect(splitSavedDuration(12 * 60 * 60)).toEqual({
      days: 1,
      months: 0,
      years: 0,
    });
    expect(splitSavedDuration(0)).toEqual({ days: 0, months: 0, years: 0 });
    expect(splitSavedDuration(-10)).toEqual({ days: 0, months: 0, years: 0 });
  });

  it('omits zero units from the joined segments', () => {
    expect(savedDurationSegments(365 * SECONDS_PER_DAY)).toEqual([
      { count: 1, unit: 'years' },
    ]);
    expect(savedDurationSegments(0)).toEqual([]);
  });
});
