import { describe, expect, it } from 'vitest';

import { parsePlaybackSeconds } from '../parsePlaybackSeconds.js';

describe('parsePlaybackSeconds', () => {
  describe('valid finite non-negative numbers', () => {
    it('returns 0 for the number 0', () => {
      expect(parsePlaybackSeconds(0)).toBe(0);
    });

    it('returns the value for positive integers', () => {
      expect(parsePlaybackSeconds(42)).toBe(42);
    });

    it('returns the value for positive floats', () => {
      expect(parsePlaybackSeconds(123.456)).toBe(123.456);
    });

    it('returns the value for large positive numbers', () => {
      expect(parsePlaybackSeconds(1_000_000)).toBe(1_000_000);
    });
  });

  describe('valid numeric strings', () => {
    it('parses "0" as 0', () => {
      expect(parsePlaybackSeconds('0')).toBe(0);
    });

    it('parses a positive integer string', () => {
      expect(parsePlaybackSeconds('42')).toBe(42);
    });

    it('parses a positive float string', () => {
      expect(parsePlaybackSeconds('123.456')).toBe(123.456);
    });

    it('parses a string with surrounding whitespace as a finite number', () => {
      expect(parsePlaybackSeconds('  42  ')).toBe(42);
    });
  });

  describe('invalid inputs resolve to undefined (tightening contract)', () => {
    it('returns undefined for null', () => {
      expect(parsePlaybackSeconds(null)).toBeUndefined();
    });

    it('returns undefined for undefined', () => {
      expect(parsePlaybackSeconds(undefined)).toBeUndefined();
    });

    it('returns undefined for NaN', () => {
      expect(parsePlaybackSeconds(Number.NaN)).toBeUndefined();
    });

    it('returns undefined for Infinity', () => {
      expect(parsePlaybackSeconds(Number.POSITIVE_INFINITY)).toBeUndefined();
    });

    it('returns undefined for -Infinity', () => {
      expect(parsePlaybackSeconds(Number.NEGATIVE_INFINITY)).toBeUndefined();
    });

    it('returns undefined for negative numbers', () => {
      expect(parsePlaybackSeconds(-5)).toBeUndefined();
    });

    it('returns undefined for a negative float', () => {
      expect(parsePlaybackSeconds(-0.001)).toBeUndefined();
    });

    it('returns undefined for a negative numeric string', () => {
      expect(parsePlaybackSeconds('-5')).toBeUndefined();
    });

    it('returns undefined for an empty string', () => {
      expect(parsePlaybackSeconds('')).toBeUndefined();
    });

    it('returns undefined for a whitespace-only string', () => {
      expect(parsePlaybackSeconds('   ')).toBeUndefined();
    });

    it('returns undefined for a non-numeric string', () => {
      expect(parsePlaybackSeconds('not a number')).toBeUndefined();
    });

    it('returns undefined for boolean true', () => {
      expect(parsePlaybackSeconds(true)).toBeUndefined();
    });

    it('returns undefined for boolean false', () => {
      expect(parsePlaybackSeconds(false)).toBeUndefined();
    });

    it('returns undefined for an object', () => {
      expect(parsePlaybackSeconds({ p: 42 })).toBeUndefined();
    });

    it('returns undefined for an array', () => {
      expect(parsePlaybackSeconds([42])).toBeUndefined();
    });
  });
});
