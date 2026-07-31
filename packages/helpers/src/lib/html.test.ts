import { describe, expect, it } from 'vitest';

import { htmlToPlainText } from './html.js';

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
