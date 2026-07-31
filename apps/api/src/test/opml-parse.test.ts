import { describe, expect, it } from 'vitest';

import { parseOpml } from '../lib/opml/parseOpml.js';

describe('parseOpml', () => {
  it('preserves the provided url scheme (the feed url is an identifier)', () => {
    // parseOpml is a pure parser: it canonicalizes but does NOT rewrite http->https.
    // https-preference (probe + graceful http fallback) is a fetch-time concern.
    const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline type="rss" text="Show A" xmlUrl="http://example.com/a.xml" />
    <outline type="rss" title="Show B" xmlUrl="https://example.com/b.xml" />
  </body>
</opml>`;

    expect(parseOpml(opml)).toEqual([
      { title: 'Show A', feedUrl: 'http://example.com/a.xml' },
      { title: 'Show B', feedUrl: 'https://example.com/b.xml' },
    ]);
  });

  it('recurses nested folders and skips malformed outlines', () => {
    const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline text="Folder">
      <outline type="rss" text="Nested" xmlUrl="https://example.com/nested.xml" />
      <outline type="rss" text="Bad" xmlUrl="ftp://example.com/bad.xml" />
      <outline type="rss" text="Empty" xmlUrl="" />
      <outline text="Empty folder">
        <outline type="rss" xmlUrl="https://example.com/deep.xml" />
      </outline>
    </outline>
  </body>
</opml>`;

    expect(parseOpml(opml)).toEqual([
      { title: 'Nested', feedUrl: 'https://example.com/nested.xml' },
      { feedUrl: 'https://example.com/deep.xml' },
    ]);
  });

  it('treats http and https of the same path as distinct feeds and dedupes exact duplicates', () => {
    // http vs https are distinct identifiers here; only exact-canonical duplicates collapse.
    const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline type="rss" text="One" xmlUrl="http://example.com/same.xml" />
    <outline type="rss" text="Two" xmlUrl="https://example.com/same.xml" />
    <outline type="rss" text="Two duplicate" xmlUrl="https://example.com/same.xml" />
  </body>
</opml>`;

    expect(parseOpml(opml)).toEqual([
      { title: 'One', feedUrl: 'http://example.com/same.xml' },
      { title: 'Two', feedUrl: 'https://example.com/same.xml' },
    ]);
  });

  it('returns empty for empty or invalid xml', () => {
    expect(parseOpml('')).toEqual([]);
    expect(parseOpml('   ')).toEqual([]);
    expect(parseOpml('<not-opml>')).toEqual([]);
  });
});
