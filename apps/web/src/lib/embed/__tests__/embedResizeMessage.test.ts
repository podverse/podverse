import { describe, expect, it } from 'vitest';

import { buildEmbedResizeListenerSnippet } from '../buildEmbedResizeListenerSnippet';
import {
  EMBED_RESIZE_MESSAGE_SOURCE,
  EMBED_RESIZE_MESSAGE_TYPE,
  isEmbedResizeMessage,
} from '../embedResizeMessage';

describe('embedResizeMessage', () => {
  it('validates resize messages with expected shape', () => {
    expect(
      isEmbedResizeMessage({
        source: EMBED_RESIZE_MESSAGE_SOURCE,
        type: EMBED_RESIZE_MESSAGE_TYPE,
        height: 480,
      })
    ).toBe(true);

    expect(isEmbedResizeMessage({ source: 'x', type: 'resize', height: 480 })).toBe(false);
    expect(isEmbedResizeMessage({ source: 'podverse-embed', type: 'resize', height: 0 })).toBe(
      false
    );
  });

  it('builds listener snippet with embed origin and constants', () => {
    const snippet = buildEmbedResizeListenerSnippet({ embedOrigin: 'https://example.test' });

    expect(snippet).toContain('var EMBED_ORIGIN = "https://example.test"');
    expect(snippet).toContain('MESSAGE_SOURCE');
    expect(snippet).toContain('iframe[data-podverse-embed-resize]');
  });
});
