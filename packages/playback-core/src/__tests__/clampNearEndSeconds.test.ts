import { describe, expect, it } from 'vitest';

import { clampNearEndSeconds } from '../clampNearEndSeconds.js';

describe('clampNearEndSeconds', () => {
  describe('clamp does not fire', () => {
    it('returns currentSeconds when far below duration - 5', () => {
      expect(clampNearEndSeconds({ currentSeconds: 10, durationSeconds: 100 })).toBe(10);
    });

    it('returns 0 when currentSeconds is 0 and duration is positive', () => {
      expect(clampNearEndSeconds({ currentSeconds: 0, durationSeconds: 100 })).toBe(0);
    });

    it('returns currentSeconds when one second below the threshold (94 vs 100)', () => {
      expect(clampNearEndSeconds({ currentSeconds: 94, durationSeconds: 100 })).toBe(94);
    });

    it('does not clamp when durationSeconds is 0', () => {
      expect(clampNearEndSeconds({ currentSeconds: 999, durationSeconds: 0 })).toBe(999);
    });

    it('does not clamp when durationSeconds is negative (defensive)', () => {
      expect(clampNearEndSeconds({ currentSeconds: 50, durationSeconds: -10 })).toBe(50);
    });
  });

  describe('clamp fires (returns 0)', () => {
    it('clamps when currentSeconds is exactly duration - 5', () => {
      expect(clampNearEndSeconds({ currentSeconds: 95, durationSeconds: 100 })).toBe(0);
    });

    it('clamps when currentSeconds is between duration - 5 and duration', () => {
      expect(clampNearEndSeconds({ currentSeconds: 97.5, durationSeconds: 100 })).toBe(0);
    });

    it('clamps when currentSeconds equals duration', () => {
      expect(clampNearEndSeconds({ currentSeconds: 100, durationSeconds: 100 })).toBe(0);
    });

    it('clamps when currentSeconds is past duration (already overran)', () => {
      expect(clampNearEndSeconds({ currentSeconds: 120, durationSeconds: 100 })).toBe(0);
    });

    it('clamps for very short durations (5s exactly: 0 >= 5 - 5)', () => {
      expect(clampNearEndSeconds({ currentSeconds: 0, durationSeconds: 5 })).toBe(0);
    });
  });
});
