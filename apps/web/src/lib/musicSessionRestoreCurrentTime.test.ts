import { describe, expect, it } from 'vitest';

import {
  parseQueueResourceNumericSeconds,
  resolveMusicSessionRestoreSeekSeconds,
} from './musicSessionRestoreCurrentTime';

describe('parseQueueResourceNumericSeconds', () => {
  it('returns undefined for nullish or NaN', () => {
    expect(parseQueueResourceNumericSeconds(undefined)).toBeUndefined();
    expect(parseQueueResourceNumericSeconds(null)).toBeUndefined();
    expect(parseQueueResourceNumericSeconds('')).toBeUndefined();
    expect(parseQueueResourceNumericSeconds('x')).toBeUndefined();
  });

  it('parses numeric strings and numbers', () => {
    expect(parseQueueResourceNumericSeconds('42.5')).toBe(42.5);
    expect(parseQueueResourceNumericSeconds(10)).toBe(10);
  });
});

describe('resolveMusicSessionRestoreSeekSeconds', () => {
  it('prefers explicit playback over abridged p when explicit is defined', () => {
    const r = resolveMusicSessionRestoreSeekSeconds({
      explicitPlaybackSeconds: 50,
      abridged: { p: '10', d: '100' },
      mpDurationHint: 100,
    });
    expect(r.seekSeconds).toBe(50);
    expect(r.durationFromIndex).toBe(100);
  });

  it('uses explicit 0 and does not fall back to abridged p', () => {
    const r = resolveMusicSessionRestoreSeekSeconds({
      explicitPlaybackSeconds: 0,
      abridged: { p: '99', d: '100' },
    });
    expect(r.seekSeconds).toBe(0);
  });

  it('uses abridged p when explicit is omitted', () => {
    const r = resolveMusicSessionRestoreSeekSeconds({
      abridged: { p: '33', d: '100' },
    });
    expect(r.seekSeconds).toBe(33);
  });

  it('trims explicit using mpDurationHint when abridged d is missing', () => {
    const r = resolveMusicSessionRestoreSeekSeconds({
      explicitPlaybackSeconds: 98,
      abridged: undefined,
      mpDurationHint: 100,
    });
    expect(r.seekSeconds).toBe(0);
  });
});
