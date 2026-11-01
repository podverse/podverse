import { describe, expect, it } from 'vitest';

import { ITEM_DETAIL_ARTWORK_MAX_TABLET, itemDetailArtworkEdge } from './screenLayout';

describe('itemDetailArtworkEdge', () => {
  it('uses the full window width on phone', () => {
    expect(itemDetailArtworkEdge(390, false)).toBe(390);
  });

  it('caps the edge on tablet', () => {
    expect(itemDetailArtworkEdge(800, true)).toBe(ITEM_DETAIL_ARTWORK_MAX_TABLET);
  });

  it('does not exceed a narrow tablet window', () => {
    expect(itemDetailArtworkEdge(480, true)).toBe(480);
  });
});
