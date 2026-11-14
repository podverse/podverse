import { describe, expect, it } from 'vitest';

import { DATABASE_CONSTANTS } from './databaseConstants.js';

describe('mediaPlayerTimeOrNull', () => {
  it.each([
    [0, '0.00'],
    [1.234, '1.23'],
    [99_999_999.99, '99999999.99'],
    [100_000_000, null],
    [-1, null],
    [Number.NaN, null],
    [Number.POSITIVE_INFINITY, null],
    [null, null],
  ])('maps %s to %s', (input, expected) => {
    expect(DATABASE_CONSTANTS.mediaPlayerTimeOrNull(input)).toBe(expected);
  });
});
