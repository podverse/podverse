import { generateOpml } from '@api/lib/opml/generateOpml.js';
import { describe, expect, it } from 'vitest';

describe('generateOpml', () => {
  it('renders directory and add-by-rss outlines', () => {
    const opml = generateOpml({
      directoryChannels: [
        { title: 'Directory Feed', feedUrl: 'https://example.com/directory.xml' },
      ],
      addByRssChannels: [
        { title: 'Add by RSS Feed', feedUrl: 'https://example.com/add-by-rss.xml' },
      ],
    });

    expect(opml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(opml).toContain('<opml version="2.0">');
    expect(opml).toContain('xmlUrl="https://example.com/directory.xml"');
    expect(opml).toContain('xmlUrl="https://example.com/add-by-rss.xml"');
  });

  it('escapes xml entities and falls back to feed url title', () => {
    const opml = generateOpml({
      directoryChannels: [
        { title: 'Rock & Roll <Podcast>', feedUrl: 'https://example.com/feed?a=1&b=2' },
      ],
      addByRssChannels: [{ title: null, feedUrl: 'https://example.com/untitled.xml' }],
    });

    expect(opml).toContain('text="Rock &amp; Roll &lt;Podcast&gt;"');
    expect(opml).toContain('xmlUrl="https://example.com/feed?a=1&amp;b=2"');
    expect(opml).toContain('text="https://example.com/untitled.xml"');
  });
});
