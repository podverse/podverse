import { describe, expect, it } from 'vitest';

import { isShrinkEligibleImageUrl, SHRINK_ELIGIBLE_IMAGE_EXTENSIONS } from './imageShrink.js';

describe('SHRINK_ELIGIBLE_IMAGE_EXTENSIONS', () => {
  it('contains only static raster extensions used by shrink pipeline', () => {
    expect(SHRINK_ELIGIBLE_IMAGE_EXTENSIONS).toEqual(['png', 'jpg', 'jpeg', 'webp']);
  });
});

describe('isShrinkEligibleImageUrl', () => {
  it('returns true for shrink-eligible extensions', () => {
    expect(isShrinkEligibleImageUrl('https://example.com/a.jpg')).toBe(true);
    expect(isShrinkEligibleImageUrl('https://example.com/a.jpeg')).toBe(true);
    expect(isShrinkEligibleImageUrl('https://example.com/a.png')).toBe(true);
    expect(isShrinkEligibleImageUrl('https://example.com/a.webp?x=1')).toBe(true);
  });

  it('returns false for gif and non-image urls', () => {
    expect(isShrinkEligibleImageUrl('https://example.com/a.gif')).toBe(false);
    expect(isShrinkEligibleImageUrl('https://example.com/a.svg')).toBe(false);
    expect(isShrinkEligibleImageUrl('https://example.com/no-extension')).toBe(false);
  });
});
