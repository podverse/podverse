import { describe, expect, it } from 'vitest';

import { parsePlaybackSeconds, resolveMediaFileDurationHintSeconds } from './mediaFileDurationHint';

describe('parsePlaybackSeconds', () => {
  it('parses positive numbers and numeric strings', () => {
    expect(parsePlaybackSeconds(12)).toBe(12);
    expect(parsePlaybackSeconds('90')).toBe(90);
  });

  it('returns 0 for missing or non-positive values', () => {
    expect(parsePlaybackSeconds(null)).toBe(0);
    expect(parsePlaybackSeconds(undefined)).toBe(0);
    expect(parsePlaybackSeconds('')).toBe(0);
    expect(parsePlaybackSeconds('nope')).toBe(0);
    expect(parsePlaybackSeconds(0)).toBe(0);
    expect(parsePlaybackSeconds(-4)).toBe(0);
  });
});

describe('resolveMediaFileDurationHintSeconds', () => {
  it('prefers a positive override over the item duration', () => {
    expect(resolveMediaFileDurationHintSeconds(600, '120')).toBe(600);
  });

  it('falls back to the item duration when the override is missing or non-positive', () => {
    expect(resolveMediaFileDurationHintSeconds(undefined, '3600')).toBe(3600);
    expect(resolveMediaFileDurationHintSeconds(0, '90')).toBe(90);
    expect(resolveMediaFileDurationHintSeconds(-1, '90')).toBe(90);
  });

  it('returns undefined when neither source has a positive duration', () => {
    expect(resolveMediaFileDurationHintSeconds(undefined, null)).toBeUndefined();
    expect(resolveMediaFileDurationHintSeconds(0, '')).toBeUndefined();
    expect(resolveMediaFileDurationHintSeconds(undefined, 'nope')).toBeUndefined();
  });
});
