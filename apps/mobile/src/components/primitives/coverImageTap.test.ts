import { describe, expect, it } from 'vitest';

import { COVER_IMAGE_TAP_SLOP, isDeliberateCoverImageTap } from './coverImageTap';

describe('isDeliberateCoverImageTap', () => {
  it('treats a missing start as a tap so assistive presses still open the viewer', () => {
    expect(isDeliberateCoverImageTap(null, { x: 80, y: 80 })).toBe(true);
  });

  it('accepts a release that stays within the slop', () => {
    expect(
      isDeliberateCoverImageTap({ x: 40, y: 40 }, { x: 40 + COVER_IMAGE_TAP_SLOP, y: 40 })
    ).toBe(true);
  });

  it('rejects a drag that exceeds the slop', () => {
    expect(
      isDeliberateCoverImageTap({ x: 40, y: 40 }, { x: 40, y: 40 + COVER_IMAGE_TAP_SLOP + 1 })
    ).toBe(false);
  });
});
