import { describe, expect, it } from 'vitest';

import { htmlToPlainText, htmlToPlainTextPreview } from './html.js';

describe('htmlToPlainText', () => {
  it('removes markup, scripts, and styles', () => {
    expect(
      htmlToPlainText(
        '<style>.hidden { display: none; }</style><p>Hello <strong>world</strong></p><script>bad()</script>'
      )
    ).toBe('Hello world');
  });

  it('decodes entities and collapses whitespace', () => {
    expect(htmlToPlainText('A&nbsp;&amp;&nbsp;B &lt; C &gt; D')).toBe('A & B < C > D');
  });
});

describe('htmlToPlainTextPreview', () => {
  it('does not leak a tag name when the source slice lands mid-attribute', () => {
    const maxChars = 40;
    const prefix = `${'word '.repeat(40)}visible `;
    const danglingHref = '<a href="https://example.com/very/long';
    const input = `${prefix}${danglingHref}/path">leaked</a> trailing`;
    const sliceAt = maxChars * 6;
    expect(input.length).toBeGreaterThan(sliceAt);
    expect(input.slice(0, sliceAt)).toContain('<a href="');
    expect(input.slice(0, sliceAt)).not.toContain('>');

    const preview = htmlToPlainTextPreview(input, maxChars);

    expect(preview).not.toMatch(/href=/i);
    expect(preview).not.toContain('example.com');
    expect(preview.includes('a href')).toBe(false);
    expect(preview.startsWith('word')).toBe(true);
  });

  it('returns an empty string for empty input', () => {
    expect(htmlToPlainTextPreview()).toBe('');
    expect(htmlToPlainTextPreview('')).toBe('');
    expect(htmlToPlainTextPreview(undefined)).toBe(htmlToPlainText(undefined));
  });

  it('returns htmlToPlainText unchanged for short input', () => {
    const input = '<p>Hello <strong>world</strong></p>';
    expect(htmlToPlainTextPreview(input)).toBe(htmlToPlainText(input));
  });

  it('bounds long input to maxChars and does not end mid-word', () => {
    const maxChars = 24;
    const input = 'alpha beta gamma delta '.repeat(40);
    const preview = htmlToPlainTextPreview(input, maxChars);
    const full = htmlToPlainText(input);
    const nextChar = full[preview.length];

    expect(preview.length).toBeLessThanOrEqual(maxChars);
    expect(full.startsWith(preview)).toBe(true);
    expect(preview).not.toMatch(/\s$/);
    expect(nextChar === undefined || /\s/.test(nextChar)).toBe(true);
    expect(preview.includes('…')).toBe(false);
    expect(preview.includes('...')).toBe(false);
  });

  it('decodes entities inside the kept region', () => {
    const maxChars = 20;
    const input = `A&nbsp;&amp;&nbsp;B ${'keep '.repeat(80)}`;
    const preview = htmlToPlainTextPreview(input, maxChars);

    expect(preview.startsWith('A & B')).toBe(true);
  });

  it('removes script and style blocks in the kept region', () => {
    const maxChars = 20;
    const input = `<style>.hidden { display: none; }</style>keep keep <script>bad()</script>${'keep '.repeat(80)}`;
    const preview = htmlToPlainTextPreview(input, maxChars);

    expect(preview.toLowerCase()).not.toContain('display');
    expect(preview.toLowerCase()).not.toContain('bad');
    expect(preview.startsWith('keep')).toBe(true);
  });
});
