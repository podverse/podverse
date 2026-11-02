import { describe, expect, it } from 'vitest';

import { isSeekDisplayHoldLanded, SEEK_DISPLAY_HOLD_TOLERANCE_SECONDS } from './seekDisplayHold';

describe('isSeekDisplayHoldLanded', () => {
  it('rejects a sample far from the seek', () => {
    expect(isSeekDisplayHoldLanded({ positionSeconds: 10, seekSeconds: 120 })).toBe(false);
    expect(isSeekDisplayHoldLanded({ positionSeconds: 200, seekSeconds: 120 })).toBe(false);
  });

  it('accepts a sample within the tolerance', () => {
    expect(isSeekDisplayHoldLanded({ positionSeconds: 120.4, seekSeconds: 120 })).toBe(true);
    expect(
      isSeekDisplayHoldLanded({
        positionSeconds: 120 - SEEK_DISPLAY_HOLD_TOLERANCE_SECONDS,
        seekSeconds: 120,
      })
    ).toBe(true);
  });

  it('rejects a non-finite sample', () => {
    expect(isSeekDisplayHoldLanded({ positionSeconds: Number.NaN, seekSeconds: 0 })).toBe(false);
  });
});
