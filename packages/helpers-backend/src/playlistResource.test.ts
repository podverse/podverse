import { describe, expect, it } from 'vitest';

import { calculateExactRangePositions } from './playlistResource.js';

describe('calculateExactRangePositions', () => {
  it('returns fixed-point neighbors for a valid decimal string', () => {
    const { position1, position2 } = calculateExactRangePositions('0.5');
    expect(typeof position1).toBe('string');
    expect(typeof position2).toBe('string');
    expect(position1 < position2).toBe(true);
  });

  it('throws a clear error for invalid input (bignumber.js v11+ STRICT default)', () => {
    expect(() => calculateExactRangePositions('not-a-number')).toThrow(
      'Invalid value for exact range position'
    );
  });
});
