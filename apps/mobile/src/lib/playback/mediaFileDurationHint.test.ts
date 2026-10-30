import { describe, expect, it } from 'vitest';

import {
  parsePlaybackSeconds,
  resolveLoadDurationSeconds,
  resolveMediaFileDurationHintSeconds,
  resolveSampleDurationSeconds,
} from './mediaFileDurationHint';

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

describe('resolveLoadDurationSeconds', () => {
  it('returns 0 for a livestream even when a hint is present', () => {
    expect(resolveLoadDurationSeconds({ hintSeconds: 3600, isLive: true })).toBe(0);
  });

  it('uses a positive hint for an item that is not live', () => {
    expect(resolveLoadDurationSeconds({ hintSeconds: 3600, isLive: false })).toBe(3600);
  });

  it('returns 0 when an item that is not live has no usable hint', () => {
    expect(resolveLoadDurationSeconds({ hintSeconds: undefined, isLive: false })).toBe(0);
    expect(resolveLoadDurationSeconds({ hintSeconds: 0, isLive: false })).toBe(0);
    expect(resolveLoadDurationSeconds({ hintSeconds: -5, isLive: false })).toBe(0);
    expect(resolveLoadDurationSeconds({ hintSeconds: Number.NaN, isLive: false })).toBe(0);
  });
});

describe('resolveSampleDurationSeconds', () => {
  it('returns 0 for a livestream whatever the engine reports', () => {
    expect(resolveSampleDurationSeconds({ isLive: true, sampleSeconds: 120 })).toBe(0);
    expect(resolveSampleDurationSeconds({ isLive: true, sampleSeconds: 0 })).toBe(0);
  });

  it('keeps a positive sample for an item that is not live and ignores an unknown length', () => {
    expect(resolveSampleDurationSeconds({ isLive: false, sampleSeconds: 120 })).toBe(120);
    expect(resolveSampleDurationSeconds({ isLive: false, sampleSeconds: 0 })).toBeNull();
    expect(resolveSampleDurationSeconds({ isLive: false, sampleSeconds: Number.NaN })).toBeNull();
  });
});
