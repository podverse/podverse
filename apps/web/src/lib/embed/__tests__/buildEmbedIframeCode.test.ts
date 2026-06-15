import { describe, expect, it } from 'vitest';

import {
  buildEmbedIframeCode,
  DEFAULT_SINGLE_AUDIO_IFRAME_HEIGHT,
  EMBED_IFRAME_ALLOW,
  EMBED_IFRAME_BORDER_STYLE,
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

  it('defaults height to the derived single-audio iframe height', () => {
    const code = buildEmbedIframeCode('https://example.test/embed/episode/demo-item');

    expect(DEFAULT_SINGLE_AUDIO_IFRAME_HEIGHT).toBeGreaterThan(0);
    expect(code).toContain(`height="${DEFAULT_SINGLE_AUDIO_IFRAME_HEIGHT}"`);
  });

  it('includes the default (darker gray) border as an inline style on the iframe (not on the embed content)', () => {
    const code = buildEmbedIframeCode('https://example.test/embed/episode/demo-item');

    expect(code).toContain(`box-sizing:border-box;border:${EMBED_IFRAME_BORDER_STYLE};`);
  });

  it('omits the border entirely when borderColor is none', () => {
    const code = buildEmbedIframeCode('https://example.test/embed/episode/demo-item', {
      borderColor: 'none',
    });

    expect(code).not.toContain('border:');
    expect(code).not.toContain('box-sizing:border-box');
  });

  it('uses a custom border color when provided', () => {
    const code = buildEmbedIframeCode('https://example.test/embed/episode/demo-item', {
      borderColor: '#abcdef',
    });

    expect(code).toContain('box-sizing:border-box;border:1px solid #abcdef;');
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

  it('uses responsive wrapper for single video presentation', () => {
    const code = buildEmbedIframeCode(
      'https://example.test/embed/episode/demo-item?presentation=video',
      {
        layout: 'single',
        presentation: 'video',
        aspectRatio: '4x3',
        width: '100%',
        title: 'Video embed',
      }
    );

    expect(code.startsWith('<div style="position:relative;')).toBe(true);
    expect(code).toContain('padding-bottom:75%');
    expect(code).toContain(
      `style="position:absolute;inset:0;width:100%;height:100%;box-sizing:border-box;border:${EMBED_IFRAME_BORDER_STYLE};"`
    );
    expect(code).not.toContain(' height="');
  });

  it('adds resize data attribute when requested', () => {
    const code = buildEmbedIframeCode('https://example.test/embed/podcast/demo-channel?resize=1', {
      includeResizeDataAttribute: true,
    });

    expect(code).toContain('data-podverse-embed-resize');
  });
});
