import { describe, expect, it } from 'vitest';

import { formatClock, formatPlaybackTime } from './time.js';

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
  it('formats string-encoded seconds', () => {
    expect(formatPlaybackTime('0')).toBe('00:00');
    expect(formatPlaybackTime('65.9')).toBe('01:05');
    expect(formatPlaybackTime('3661')).toBe('01:01:01');
  });

  it('returns the zero clock for missing or invalid values', () => {
    expect(formatPlaybackTime(null)).toBe('00:00');
    expect(formatPlaybackTime('invalid')).toBe('00:00');
    expect(formatPlaybackTime('-1')).toBe('00:00');
  });
});
