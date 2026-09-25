import { describe, expect, it } from 'vitest';

import { formatClock, formatHHMMSS, formatPlaybackTime } from './time.js';

describe('formatHHMMSS', () => {
  it('omits hours until the value reaches an hour and never pads the first unit', () => {
    expect(formatHHMMSS(0)).toBe('0:00');
    expect(formatHHMMSS(65.9)).toBe('1:05');
    expect(formatHHMMSS(4512)).toBe('1:15:12');
    expect(formatHHMMSS(3661)).toBe('1:01:01');
    expect(formatHHMMSS('4512')).toBe('1:15:12');
  });

  it('returns the zero clock for invalid values', () => {
    expect(formatHHMMSS(Number.NaN)).toBe('0:00');
    expect(formatHHMMSS(-1)).toBe('0:00');
    expect(formatHHMMSS('nope')).toBe('0:00');
  });
});

describe('formatClock', () => {
  it('formats finite non-negative seconds', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(65.9)).toBe('01:05');
    expect(formatClock(3600)).toBe('60:00');
  });

  it('uses the configured fallback for invalid values', () => {
    expect(formatClock(null)).toBe('00:00');
    expect(formatClock(Number.NaN)).toBe('00:00');
    expect(formatClock(-1, { fallback: '' })).toBe('');
  });
});

describe('formatPlaybackTime', () => {
  it('formats string-encoded seconds with the same clock as formatHHMMSS', () => {
    expect(formatPlaybackTime('0')).toBe('0:00');
    expect(formatPlaybackTime('65.9')).toBe('1:05');
    expect(formatPlaybackTime('3661')).toBe('1:01:01');
  });

  it('returns the zero clock for missing or invalid values', () => {
    expect(formatPlaybackTime(null)).toBe('0:00');
    expect(formatPlaybackTime('invalid')).toBe('0:00');
    expect(formatPlaybackTime('-1')).toBe('0:00');
  });
});
