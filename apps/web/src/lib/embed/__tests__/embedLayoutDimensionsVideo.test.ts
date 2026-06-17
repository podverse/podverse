import { describe, expect, it } from 'vitest';

import {
  getEmbedListResponsiveIframeHeightPx,
  getEmbedListVideoPlaceholderHeightPx,
} from '../embedLayoutDimensions';
import {
  EMBED_LIST_ROW_HEIGHT_PX,
  EMBED_PRESENTATION_SELECTOR_HEIGHT_PX,
} from '../embedLayoutTokens';

describe('embedLayoutDimensions video list', () => {
  it('derives fixed list video placeholder heights from aspect ratio', () => {
    expect(getEmbedListVideoPlaceholderHeightPx('16x9')).toBe(360);
    expect(getEmbedListVideoPlaceholderHeightPx('4x3')).toBe(480);
    expect(getEmbedListVideoPlaceholderHeightPx('1x1')).toBe(640);
  });

  it('derives list responsive iframe heights from full-bleed video panel + rows', () => {
    expect(getEmbedListResponsiveIframeHeightPx({ aspectRatio: '16x9', listVisibleRows: 2 })).toBe(
      360 + EMBED_LIST_ROW_HEIGHT_PX * 2
    );
    expect(getEmbedListResponsiveIframeHeightPx({ aspectRatio: '4x3', listVisibleRows: 5 })).toBe(
      480 + EMBED_LIST_ROW_HEIGHT_PX * 5
    );
    expect(getEmbedListResponsiveIframeHeightPx({ aspectRatio: '1x1', listVisibleRows: 10 })).toBe(
      640 + EMBED_LIST_ROW_HEIGHT_PX * 10
    );
  });

  it('adds optional presentation selector height when requested', () => {
    expect(
      getEmbedListResponsiveIframeHeightPx({
        aspectRatio: '16x9',
        listVisibleRows: 5,
        includePresentationSelector: true,
      })
    ).toBe(360 + EMBED_LIST_ROW_HEIGHT_PX * 5 + EMBED_PRESENTATION_SELECTOR_HEIGHT_PX);
  });
});
