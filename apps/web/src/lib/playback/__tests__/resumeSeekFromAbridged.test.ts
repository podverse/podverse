import { describe, expect, it } from 'vitest';

import { resumeSeekFromAbridged } from '../resumeSeekFromAbridged';

describe('resumeSeekFromAbridged', () => {
  describe('explicit override wins (no clamp)', () => {
    it('returns explicitSeconds when finite non-negative and abridged is absent', () => {
      expect(resumeSeekFromAbridged({ abridged: null, explicitSeconds: 42 })).toBe(42);
    });

    it('returns explicitSeconds even when abridged would otherwise clamp', () => {
      expect(
        resumeSeekFromAbridged({
          abridged: { p: 99, d: 100 },
          explicitSeconds: 42,
        })
      ).toBe(42);
    });

    it('returns explicitSeconds without applying the near-end clamp against abridged d', () => {
      expect(
        resumeSeekFromAbridged({
          abridged: { p: 0, d: 100 },
          explicitSeconds: 96,
        })
      ).toBe(96);
    });

    it('accepts a numeric-string explicit override', () => {
      expect(resumeSeekFromAbridged({ abridged: null, explicitSeconds: '42' })).toBe(42);
    });

    it('returns 0 when explicit is exactly 0', () => {
      expect(
        resumeSeekFromAbridged({
          abridged: { p: 50, d: 100 },
          explicitSeconds: 0,
        })
      ).toBe(0);
    });
  });

  describe('invalid explicit falls through to abridged', () => {
    it('falls through when explicit is negative', () => {
      expect(
        resumeSeekFromAbridged({
          abridged: { p: 30, d: 100 },
          explicitSeconds: -5,
        })
      ).toBe(30);
    });

    it('falls through when explicit is NaN', () => {
      expect(
        resumeSeekFromAbridged({
          abridged: { p: 30, d: 100 },
          explicitSeconds: Number.NaN,
        })
      ).toBe(30);
    });

    it('falls through when explicit is undefined', () => {
      expect(
        resumeSeekFromAbridged({
          abridged: { p: 30, d: 100 },
          explicitSeconds: undefined,
        })
      ).toBe(30);
    });

    it('falls through when explicit is null', () => {
      expect(
        resumeSeekFromAbridged({
          abridged: { p: 30, d: 100 },
          explicitSeconds: null,
        })
      ).toBe(30);
    });

    it('falls through when explicit is a non-numeric string', () => {
      expect(
        resumeSeekFromAbridged({
          abridged: { p: 30, d: 100 },
          explicitSeconds: 'not a number',
        })
      ).toBe(30);
    });
  });

  describe('abridged-only path', () => {
    it('returns 0 when abridged is null', () => {
      expect(resumeSeekFromAbridged({ abridged: null })).toBe(0);
    });

    it('returns 0 when abridged is undefined', () => {
      expect(resumeSeekFromAbridged({ abridged: undefined })).toBe(0);
    });

    it('returns 0 when abridged.p is missing', () => {
      expect(resumeSeekFromAbridged({ abridged: { d: 100 } })).toBe(0);
    });

    it('returns 0 when abridged.p is invalid (negative)', () => {
      expect(resumeSeekFromAbridged({ abridged: { p: -10, d: 100 } })).toBe(0);
    });

    it('returns parsed p when below near-end threshold', () => {
      expect(resumeSeekFromAbridged({ abridged: { p: 30, d: 100 } })).toBe(30);
    });

    it('clamps to 0 when p is at or past duration - 5', () => {
      expect(resumeSeekFromAbridged({ abridged: { p: 95, d: 100 } })).toBe(0);
    });

    it('clamps to 0 when p is past duration', () => {
      expect(resumeSeekFromAbridged({ abridged: { p: 120, d: 100 } })).toBe(0);
    });

    it('does not clamp when abridged.d is missing (no duration to compare)', () => {
      expect(resumeSeekFromAbridged({ abridged: { p: 95 } })).toBe(95);
    });

    it('does not clamp when abridged.d is 0', () => {
      expect(resumeSeekFromAbridged({ abridged: { p: 95, d: 0 } })).toBe(95);
    });

    it('parses numeric-string p and d', () => {
      expect(resumeSeekFromAbridged({ abridged: { p: '30', d: '100' } })).toBe(30);
    });
  });
});
