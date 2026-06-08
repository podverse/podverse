import { describe, expect, it } from 'vitest';

import {
  buildEmbedIframeCode,
  DEFAULT_SINGLE_AUDIO_IFRAME_HEIGHT,
  EMBED_IFRAME_ALLOW,
} from '../buildEmbedIframeCode';

describe('buildEmbedIframeCode', () => {
  it('uses the shared embed iframe allow contract', () => {
    expect(EMBED_IFRAME_ALLOW).toBe('autoplay');
  });

  it('emits allow from EMBED_IFRAME_ALLOW and omits legacy encrypted-media', () => {
    const code = buildEmbedIframeCode('https://example.test/embed/episode/demo-item');

    expect(code).toContain(`allow="${EMBED_IFRAME_ALLOW}"`);
    expect(code).not.toContain('encrypted-media');
  });

  it('defaults height to single-audio iframe height', () => {
    const code = buildEmbedIframeCode('https://example.test/embed/episode/demo-item');

    expect(code).toContain(`height="${DEFAULT_SINGLE_AUDIO_IFRAME_HEIGHT}"`);
  });

  it('honors custom title, width, and height options', () => {
    const code = buildEmbedIframeCode('https://example.test/embed/podcast/demo-channel', {
      title: 'Custom embed title',
      width: '640',
      height: 744,
    });

    expect(code).toContain('src="https://example.test/embed/podcast/demo-channel"');
    expect(code).toContain('width="640"');
    expect(code).toContain('height="744"');
    expect(code).toContain('title="Custom embed title"');
    expect(code).toContain(`allow="${EMBED_IFRAME_ALLOW}"`);
  });
});
