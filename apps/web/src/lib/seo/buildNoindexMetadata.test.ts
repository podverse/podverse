import { describe, expect, it } from 'vitest';

import { buildNoindexMetadata } from './buildNoindexMetadata';

describe('buildNoindexMetadata', () => {
  it('sets robots noindex and nofollow', () => {
    const metadata = buildNoindexMetadata();
    expect(metadata.robots).toEqual({
      index: false,
      follow: false,
    });
  });

  it('includes title when provided', () => {
    const metadata = buildNoindexMetadata('Search');
    expect(metadata.title).toBe('Search');
  });
});
