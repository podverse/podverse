import { describe, expect, it } from 'vitest';

import { formatEmbedIframeElement, formatHtmlElement } from '../formatEmbedHtmlCode';

describe('formatEmbedHtmlCode', () => {
  it('formats attributes on a single line', () => {
    expect(
      formatHtmlElement('iframe', [
        { name: 'src', value: 'https://example.test/embed' },
        { name: 'width', value: '100%' },
      ])
    ).toBe('<iframe src="https://example.test/embed" width="100%"></iframe>');
  });

  it('formats boolean attributes without values', () => {
    const code = formatEmbedIframeElement('https://example.test/embed', { title: 'Embed' });

    expect(code).toBe(
      '<iframe frameborder="0" allow="autoplay" title="Embed" src="https://example.test/embed"></iframe>'
    );
  });

  it('places src as the last attribute', () => {
    const code = formatEmbedIframeElement('https://example.test/embed', {
      title: 'Embed',
      width: '100%',
      height: 400,
      borderStyleAttribute: 'box-sizing:border-box',
    });

    expect(code).toBe(
      '<iframe width="100%" height="400" frameborder="0" allow="autoplay" title="Embed" style="box-sizing:border-box" src="https://example.test/embed"></iframe>'
    );
    expect(code.indexOf('src=')).toBeGreaterThan(code.indexOf('title='));
  });

  it('embeds nested iframe markup inline inside a wrapper element', () => {
    const iframe = formatEmbedIframeElement('https://example.test/embed', {
      title: 'Embed',
    });

    expect(formatHtmlElement('div', [{ name: 'style', value: 'position:relative;' }], iframe)).toBe(
      '<div style="position:relative;"><iframe frameborder="0" allow="autoplay" title="Embed" src="https://example.test/embed"></iframe></div>'
    );
  });
});
