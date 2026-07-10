import { describe, expect, it } from 'vitest';

import { isShrinkGeneratedObjectKey, isShrinkResizedPublicUrl } from './shrinkKeyPattern.js';

describe('isShrinkGeneratedObjectKey', () => {
  it('accepts shrink pipeline keys', () => {
    expect(
      isShrinkGeneratedObjectKey(
        'images/item/42/abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789-w400-cabcdef012345678.webp'
      )
    ).toBe(true);
    expect(
      isShrinkGeneratedObjectKey(
        'images/channel/7/abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789-w320-c0123456789abcdef.webp'
      )
    ).toBe(true);
  });

  it('rejects non-shrink keys under images/', () => {
    expect(isShrinkGeneratedObjectKey('images/item/42/original.webp')).toBe(false);
    expect(isShrinkGeneratedObjectKey('images/other/1/foo.webp')).toBe(false);
    expect(isShrinkGeneratedObjectKey('uploads/images/item/1/x.webp')).toBe(false);
  });
});

describe('isShrinkResizedPublicUrl', () => {
  const cdnBaseUrl = 'https://cdn.example.com';

  it('accepts shrink CDN URLs for the configured base', () => {
    const url =
      'https://cdn.example.com/images/item/42/abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789-w400-cabcdef012345678.webp';
    expect(isShrinkResizedPublicUrl({ url, cdnBaseUrl })).toBe(true);
  });

  it('rejects other CDN bases and non-shrink paths', () => {
    const url =
      'https://cdn.example.com/images/item/42/abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789-w400-cabcdef012345678.webp';
    expect(isShrinkResizedPublicUrl({ url, cdnBaseUrl: 'https://other.example.com' })).toBe(false);
    expect(
      isShrinkResizedPublicUrl({
        url: 'https://cdn.example.com/images/item/42/manual.webp',
        cdnBaseUrl,
      })
    ).toBe(false);
  });
});
