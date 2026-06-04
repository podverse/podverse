import { describe, expect, it } from 'vitest';

import { toSeoPlainText } from './toSeoPlainText';

describe('toSeoPlainText', () => {
  it('returns empty string for missing input', () => {
    expect(toSeoPlainText()).toBe('');
    expect(toSeoPlainText('')).toBe('');
    expect(toSeoPlainText(null)).toBe('');
  });

  it('strips html and collapses whitespace', () => {
    expect(toSeoPlainText(' <p>Hello&nbsp; <strong>world</strong></p>\n\n and more ')).toBe(
      'Hello world and more'
    );
  });

  it('decodes common html entities', () => {
    expect(toSeoPlainText('Rock &amp; Roll &quot;Forever&quot;')).toBe('Rock & Roll "Forever"');
  });
});
