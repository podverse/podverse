import { describe, expect, it } from 'vitest';

import { buildCarryoverOutlines, carryoverOutlineCount } from './carryoverOutlines';

describe('buildCarryoverOutlines', () => {
  it('returns no outlines for an empty list', () => {
    const outlines = buildCarryoverOutlines([]);
    expect(outlines).toEqual({ addByRssFeeds: [], directoryFeeds: [], skipped: 0 });
    expect(carryoverOutlineCount(outlines)).toBe(0);
  });

  it('keeps a directory row only when it has a title and a feed address', () => {
    const outlines = buildCarryoverOutlines([
      {
        cachedFeedUrl: 'https://example.com/ready.xml',
        cachedTitle: 'Ready Show',
        legacyId: 'pod-ready',
        legacyKind: 'podcast',
      },
      {
        cachedFeedUrl: 'https://example.com/no-title.xml',
        cachedTitle: null,
        legacyId: 'pod-no-title',
        legacyKind: 'podcast',
      },
      {
        cachedFeedUrl: '  ',
        cachedTitle: 'Blank Address',
        legacyId: 'pod-blank-url',
        legacyKind: 'podcast',
      },
      {
        cachedFeedUrl: null,
        cachedTitle: null,
        legacyId: 'pod-neither',
        legacyKind: 'podcast',
      },
    ]);

    expect(outlines.directoryFeeds).toEqual([
      { feedUrl: 'https://example.com/ready.xml', title: 'Ready Show' },
    ]);
    expect(outlines.addByRssFeeds).toEqual([]);
    expect(outlines.skipped).toBe(3);
  });

  it('uses the Add by RSS id as the address and skips a row with no title', () => {
    const outlines = buildCarryoverOutlines([
      {
        cachedFeedUrl: null,
        cachedTitle: '  Saved Feed  ',
        legacyId: 'https://example.com/saved.xml',
        legacyKind: 'add_by_rss',
      },
      {
        cachedFeedUrl: 'https://example.com/cached.xml',
        cachedTitle: null,
        legacyId: 'https://example.com/untitled.xml',
        legacyKind: 'add_by_rss',
      },
      {
        cachedFeedUrl: null,
        cachedTitle: 'No Address',
        legacyId: '   ',
        legacyKind: 'add_by_rss',
      },
    ]);

    expect(outlines.addByRssFeeds).toEqual([
      { feedUrl: 'https://example.com/saved.xml', title: 'Saved Feed' },
    ]);
    expect(outlines.directoryFeeds).toEqual([]);
    expect(outlines.skipped).toBe(2);
  });

  it('splits both kinds and keeps each kind in input order', () => {
    const outlines = buildCarryoverOutlines([
      {
        cachedFeedUrl: 'https://example.com/a.xml',
        cachedTitle: 'Directory A',
        legacyId: 'pod-a',
        legacyKind: 'podcast',
      },
      {
        cachedFeedUrl: null,
        cachedTitle: 'Added',
        legacyId: 'https://example.com/added.xml',
        legacyKind: 'add_by_rss',
      },
      {
        cachedFeedUrl: 'https://example.com/b.xml',
        cachedTitle: 'Directory B',
        legacyId: 'pod-b',
        legacyKind: 'podcast',
      },
    ]);

    expect(outlines.directoryFeeds.map((feed) => feed.title)).toEqual([
      'Directory A',
      'Directory B',
    ]);
    expect(outlines.addByRssFeeds.map((feed) => feed.title)).toEqual(['Added']);
    expect(outlines.skipped).toBe(0);
    expect(carryoverOutlineCount(outlines)).toBe(3);
  });
});
