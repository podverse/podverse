import { describe, expect, it } from 'vitest';

import { parseOptionalNonNegativeInt } from './parseEnvNonNegative.js';

describe('parseOptionalNonNegativeInt', () => {
  it('returns undefined for unset or blank values', () => {
    expect(parseOptionalNonNegativeInt(undefined)).toBeUndefined();
    expect(parseOptionalNonNegativeInt(null)).toBeUndefined();
    expect(parseOptionalNonNegativeInt('')).toBeUndefined();
    expect(parseOptionalNonNegativeInt('   ')).toBeUndefined();
  });

  it('parses non-negative integers', () => {
    expect(parseOptionalNonNegativeInt('0')).toBe(0);
    expect(parseOptionalNonNegativeInt('200')).toBe(200);
    expect(parseOptionalNonNegativeInt('  1500 ')).toBe(1500);
  });

  it('returns undefined for invalid or negative values', () => {
    expect(parseOptionalNonNegativeInt('not-a-number')).toBeUndefined();
    expect(parseOptionalNonNegativeInt('-1')).toBeUndefined();
    expect(parseOptionalNonNegativeInt('1.5')).toBeUndefined();
  });
});
