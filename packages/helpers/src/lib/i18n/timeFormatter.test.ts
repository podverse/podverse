import { describe, expect, it } from 'vitest';

import { formatSecondsToReadableDuration, toCompactPlaybackDuration } from './timeFormatter.js';

const FULL_DURATION_WORDS = /\b(hour|hours|minute|minutes|second|seconds)\b/i;

describe('toCompactPlaybackDuration', () => {
  it('returns null when there is no duration to show', () => {
    expect(toCompactPlaybackDuration(0)).toBeNull();
    expect(toCompactPlaybackDuration(-4)).toBeNull();
    expect(toCompactPlaybackDuration(Number.NaN)).toBeNull();
  });

  it('rounds leftover seconds up to the next minute', () => {
    expect(toCompactPlaybackDuration(1)).toEqual({ hours: 0, minutes: 1 });
    expect(toCompactPlaybackDuration(45)).toEqual({ hours: 0, minutes: 1 });
    expect(toCompactPlaybackDuration(61)).toEqual({ hours: 0, minutes: 2 });
  });

  it('keeps hours when the duration is at least one hour, and still reports minutes', () => {
    expect(toCompactPlaybackDuration(3600)).toEqual({ hours: 1, minutes: 0 });
    expect(toCompactPlaybackDuration(3600 + 33 * 60)).toEqual({ hours: 1, minutes: 33 });
    expect(toCompactPlaybackDuration(3600 + 33 * 60 + 1)).toEqual({ hours: 1, minutes: 34 });
  });
});

describe('formatSecondsToReadableDuration', () => {
  it('uses short English units for hours and minutes', () => {
    expect(formatSecondsToReadableDuration(String(3600 + 33 * 60))).toBe('1 hr 33 min');
  });

  it('uses minutes only when the duration is under an hour', () => {
    expect(formatSecondsToReadableDuration('45')).toBe('1 min');
  });

  it('keeps a zero minute part when the duration is whole hours', () => {
    expect(formatSecondsToReadableDuration('3600')).toBe('1 hr 0 min');
  });

  it('never emits full hour, minute, or second words', () => {
    const samples = ['0', '45', '90', '3600', String(3600 + 33 * 60)];
    for (const input of samples) {
      expect(formatSecondsToReadableDuration(input)).not.toMatch(FULL_DURATION_WORDS);
    }
  });
});
