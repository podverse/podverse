import { describe, expect, it } from 'vitest';

import { getChipRevealOffset } from './chipRowReveal';

const row = { viewportWidth: 400, contentWidth: 900, edgeInset: 12 };

describe('getChipRevealOffset', () => {
  it('leaves a fully visible chip where it is', () => {
    expect(getChipRevealOffset({ ...row, chipX: 100, chipWidth: 80, scrollX: 0 })).toBeNull();
  });

  it('scrolls a chip past the trailing edge in, with the inset after it', () => {
    expect(getChipRevealOffset({ ...row, chipX: 500, chipWidth: 80, scrollX: 0 })).toBe(192);
  });

  it('scrolls a chip that is only partly visible at the trailing edge', () => {
    expect(getChipRevealOffset({ ...row, chipX: 360, chipWidth: 80, scrollX: 0 })).toBe(52);
  });

  it('scrolls a chip past the leading edge back in, with the inset before it', () => {
    expect(getChipRevealOffset({ ...row, chipX: 100, chipWidth: 80, scrollX: 300 })).toBe(88);
  });

  it('stops at the content edges', () => {
    expect(getChipRevealOffset({ ...row, chipX: 5, chipWidth: 80, scrollX: 200 })).toBe(0);
    expect(getChipRevealOffset({ ...row, chipX: 820, chipWidth: 80, scrollX: 0 })).toBe(500);
  });

  it('does not scroll when the row is already at its end', () => {
    expect(getChipRevealOffset({ ...row, chipX: 880, chipWidth: 40, scrollX: 500 })).toBeNull();
  });
});
