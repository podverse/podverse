import { describe, expect, it } from 'vitest';

import { EMBED_BUILDER_PATHNAME, isEmbedPathname } from '../isEmbedPathname';

describe('isEmbedPathname', () => {
  it('returns false for empty or null pathname', () => {
    expect(isEmbedPathname(null)).toBe(false);
    expect(isEmbedPathname(undefined)).toBe(false);
    expect(isEmbedPathname('')).toBe(false);
  });

  it('returns false for full-chrome embed routes', () => {
    expect(isEmbedPathname('/embed')).toBe(false);
    expect(isEmbedPathname(EMBED_BUILDER_PATHNAME)).toBe(false);
    expect(isEmbedPathname(`${EMBED_BUILDER_PATHNAME}/extra`)).toBe(false);
  });

  it('returns true for chromeless embed iframe routes', () => {
    expect(isEmbedPathname('/embed/podcast/abc123')).toBe(true);
    expect(isEmbedPathname('/embed/episode/xyz')).toBe(true);
  });
});
