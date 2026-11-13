import { describe, expect, it } from 'vitest';

import { buildDeviceOpmlExport, opmlExportFilename } from './opmlExportFile';

describe('buildDeviceOpmlExport', () => {
  it('returns null when there are no feeds to write', () => {
    expect(buildDeviceOpmlExport({ addByRssFeeds: [], directoryFeeds: [] })).toBeNull();
  });

  it('writes directory feeds before Add by RSS feeds and names an untitled feed by its URL', () => {
    const opml = buildDeviceOpmlExport({
      addByRssFeeds: [
        { feedUrl: 'https://example.com/private.xml', title: 'Private Feed' },
        { feedUrl: 'https://example.com/untitled.xml', title: null },
      ],
      directoryFeeds: [{ feedUrl: 'https://example.com/directory.xml', title: 'Directory Show' }],
    });

    expect(opml).not.toBeNull();
    const text = opml ?? '';
    expect(text.match(/xmlUrl="/g)).toHaveLength(3);
    expect(text.indexOf('https://example.com/directory.xml')).toBeLessThan(
      text.indexOf('https://example.com/private.xml')
    );
    expect(text).toContain(
      'text="https://example.com/untitled.xml" title="https://example.com/untitled.xml"'
    );
  });

  it('writes a file of directory feeds alone', () => {
    const opml = buildDeviceOpmlExport({
      addByRssFeeds: [],
      directoryFeeds: [{ feedUrl: 'https://example.com/directory.xml', title: 'Directory Show' }],
    });

    expect(opml).toContain('xmlUrl="https://example.com/directory.xml"');
    expect(opml?.match(/xmlUrl="/g)).toHaveLength(1);
  });
});

describe('opmlExportFilename', () => {
  it('names the file by the UTC date', () => {
    expect(opmlExportFilename(new Date('2026-11-12T08:00:00Z'))).toBe(
      'podverse-opml-export-2026-11-12.opml'
    );
  });
});
