import { describe, expect, it } from 'vitest';

import type { V4LocalStateRaw } from './parseV4LocalState';
import { parseV4LocalState } from './parseV4LocalState';

const emptyRaw = (): V4LocalStateRaw => ({
  addByRssFeedUrls: null,
  addByRssPodcasts: null,
  subscribedPodcastIds: null,
  subscribedPodcasts: null,
});

describe('parseV4LocalState', () => {
  it('reads malformed JSON and the wrong shape as empty', () => {
    const cases: Array<Partial<V4LocalStateRaw>> = [
      { subscribedPodcastIds: '{' },
      { subscribedPodcastIds: '{"id":"pod"}' },
      { subscribedPodcastIds: '"pod"' },
      { subscribedPodcastIds: '123' },
      { subscribedPodcastIds: 'null' },
      { subscribedPodcasts: '{' },
      { addByRssFeedUrls: '{' },
      { addByRssPodcasts: '{' },
      { addByRssFeedUrls: '{"url":"https://example.com/feed"}' },
    ];

    for (const partial of cases) {
      expect(parseV4LocalState({ ...emptyRaw(), ...partial })).toEqual([]);
    }
    expect(parseV4LocalState(emptyRaw())).toEqual([]);
  });

  it('keeps podcast ids and attaches a cached object only when that id is in the list', () => {
    const entries = parseV4LocalState({
      ...emptyRaw(),
      subscribedPodcastIds: JSON.stringify(['pod-a', 1, '', '  ', 'pod-a', ' pod-b ', 'pod-c']),
      subscribedPodcasts: JSON.stringify([
        {
          id: 'missing',
          title: 'Left Out',
          feedUrls: [{ url: 'https://example.com/missing.xml' }],
        },
        { id: 'pod-b', title: '  Second  ', feedUrls: [{ url: 'https://example.com/b.xml' }] },
        { id: 'pod-a' },
        { title: 'No Id' },
        'not-an-object',
      ]),
    });

    expect(entries).toEqual([
      {
        cachedFeedUrl: null,
        cachedTitle: null,
        legacyId: 'pod-a',
        legacyKind: 'podcast',
      },
      {
        cachedFeedUrl: 'https://example.com/b.xml',
        cachedTitle: 'Second',
        legacyId: 'pod-b',
        legacyKind: 'podcast',
      },
      {
        cachedFeedUrl: null,
        cachedTitle: null,
        legacyId: 'pod-c',
        legacyKind: 'podcast',
      },
    ]);
  });

  it('drops a cached address that is not http or https and keeps the podcast id', () => {
    const entries = parseV4LocalState({
      ...emptyRaw(),
      subscribedPodcastIds: JSON.stringify(['pod-a']),
      subscribedPodcasts: JSON.stringify([
        {
          feedUrls: [
            { url: 'ftp://example.com/show.xml' },
            { url: 'https://example.com/later.xml' },
          ],
          id: 'pod-a',
          title: 'Show',
        },
      ]),
    });

    expect(entries).toEqual([
      {
        cachedFeedUrl: null,
        cachedTitle: 'Show',
        legacyId: 'pod-a',
        legacyKind: 'podcast',
      },
    ]);
  });

  it('collapses duplicate and trailing-slash Add by RSS addresses and removes userinfo', () => {
    const entries = parseV4LocalState({
      ...emptyRaw(),
      addByRssFeedUrls: JSON.stringify([
        'https://alice:pw@Example.com/show/',
        'https://example.com/show',
        'https://example.com/other.xml',
        'ftp://example.com/nope.xml',
        '',
        4,
      ]),
      addByRssPodcasts: JSON.stringify([
        { addByRSSPodcastFeedUrl: 'https://example.com/show/', title: 'Kept' },
        { addByRSSPodcastFeedUrl: 'https://example.com/show', title: 'Later' },
        { addByRSSPodcastFeedUrl: 'https://example.com/absent.xml', title: 'Ignored' },
        { title: 'No Address' },
      ]),
    });

    expect(entries).toEqual([
      {
        cachedFeedUrl: null,
        cachedTitle: 'Kept',
        legacyId: 'https://example.com/show',
        legacyKind: 'add_by_rss',
      },
      {
        cachedFeedUrl: null,
        cachedTitle: null,
        legacyId: 'https://example.com/other.xml',
        legacyKind: 'add_by_rss',
      },
    ]);
  });

  it('does not keep a password from an address or from an object field', () => {
    const secret = 's3cret-value';
    const entries = parseV4LocalState({
      ...emptyRaw(),
      addByRssFeedUrls: JSON.stringify([`https://bob:${secret}@example.com/rss`]),
      addByRssPodcasts: JSON.stringify([
        {
          addByRSSPodcastFeedUrl: `https://bob:${secret}@example.com/rss`,
          password: secret,
          title: 'Feed',
        },
      ]),
      subscribedPodcastIds: JSON.stringify(['pod-a']),
      subscribedPodcasts: JSON.stringify([
        {
          feedUrls: [{ url: `https://alice:${secret}@example.com/feed.xml` }],
          id: 'pod-a',
          password: secret,
          title: 'Show',
        },
      ]),
    });

    expect(entries).toEqual([
      {
        cachedFeedUrl: 'https://example.com/feed.xml',
        cachedTitle: 'Show',
        legacyId: 'pod-a',
        legacyKind: 'podcast',
      },
      {
        cachedFeedUrl: null,
        cachedTitle: 'Feed',
        legacyId: 'https://example.com/rss',
        legacyKind: 'add_by_rss',
      },
    ]);
    expect(JSON.stringify(entries).includes(secret)).toBe(false);
    expect(JSON.stringify(entries).includes('alice')).toBe(false);
    expect(JSON.stringify(entries).includes('bob')).toBe(false);
  });
});
