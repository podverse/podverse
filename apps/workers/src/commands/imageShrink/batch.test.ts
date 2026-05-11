import { describe, expect, it } from 'vitest';

import { getImageShrinkMetadataSkipReason, isImageShrinkTargetUrlEligible } from './batch.js';

describe('isImageShrinkTargetUrlEligible', () => {
  it('allows static raster extensions and rejects gif', () => {
    expect(isImageShrinkTargetUrlEligible('https://example.com/a.jpg')).toBe(true);
    expect(isImageShrinkTargetUrlEligible('https://example.com/a.jpeg')).toBe(true);
    expect(isImageShrinkTargetUrlEligible('https://example.com/a.png')).toBe(true);
    expect(isImageShrinkTargetUrlEligible('https://example.com/a.webp')).toBe(true);
    expect(isImageShrinkTargetUrlEligible('https://example.com/a.gif')).toBe(false);
  });
});

describe('getImageShrinkMetadataSkipReason', () => {
  it('skips when format is missing', () => {
    expect(getImageShrinkMetadataSkipReason({})).toBe('missing-format');
  });

  it('skips gif format', () => {
    expect(getImageShrinkMetadataSkipReason({ format: 'gif' })).toBe('gif-format');
  });

  it('skips unsupported formats', () => {
    expect(getImageShrinkMetadataSkipReason({ format: 'svg' })).toBe('unsupported-format');
  });

  it('skips animated webp via pages metadata', () => {
    expect(getImageShrinkMetadataSkipReason({ format: 'webp', pages: 2 })).toBe('animated-webp');
  });

  it('allows static eligible metadata', () => {
    expect(getImageShrinkMetadataSkipReason({ format: 'webp', pages: 1 })).toBeNull();
    expect(getImageShrinkMetadataSkipReason({ format: 'jpeg' })).toBeNull();
    expect(getImageShrinkMetadataSkipReason({ format: 'png' })).toBeNull();
  });
});
