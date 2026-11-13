import { describe, expect, it } from 'vitest';

import { getMd5Hash, normalizeRawFeedForHash } from './hash.js';

describe('normalizeRawFeedForHash', () => {
  it('trims surrounding whitespace and reads CRLF as LF', () => {
    expect(normalizeRawFeedForHash('  <rss>\r\n</rss>  ')).toBe('<rss>\n</rss>');
  });

  it('leaves a lone CR alone', () => {
    expect(normalizeRawFeedForHash('a\rb')).toBe('a\rb');
  });

  it('hashes the same body when the host flips CRLF and surrounding spaces', () => {
    const lineFeed = '<rss>\n<item/>\n</rss>';
    const crlfWithSurroundingSpaces = '  <rss>\r\n<item/>\r\n</rss>  ';

    expect(getMd5Hash(normalizeRawFeedForHash(lineFeed))).toBe(
      getMd5Hash(normalizeRawFeedForHash(crlfWithSurroundingSpaces))
    );
  });
});
