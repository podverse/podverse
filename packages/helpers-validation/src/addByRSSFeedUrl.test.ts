import { describe, expect, it } from 'vitest';

import {
  ADD_BY_RSS_CREDENTIAL_MAX_LENGTH,
  addByRSSDirectoryMatchUrlVariants,
  canonicalAddByRSSFeedUrl,
  canSubmitAddByRssCredentials,
  canSubmitAddByRssFeed,
  resolveAddByRSSFeedUrlCredentials,
} from './addByRSSFeedUrl.js';

describe('resolveAddByRSSFeedUrlCredentials', () => {
  it('prefers explicit credentials over URL userinfo and strips the userinfo', () => {
    expect(
      resolveAddByRSSFeedUrlCredentials('https://url-user:url-pw@example.com/feed', 'form', 'pw')
    ).toEqual({
      feedUrl: 'https://example.com/feed',
      credentials: { username: 'form', password: 'pw' },
    });
  });

  it('uses a complete userinfo pair when no explicit credentials are given', () => {
    expect(resolveAddByRSSFeedUrlCredentials('https://alice:s%40cret@example.com/feed')).toEqual({
      feedUrl: 'https://example.com/feed',
      credentials: { username: 'alice', password: 's@cret' },
    });
  });

  it('discards incomplete userinfo and still strips it from the URL', () => {
    expect(resolveAddByRSSFeedUrlCredentials('https://alice@example.com/feed')).toEqual({
      feedUrl: 'https://example.com/feed',
      credentials: null,
    });
  });

  it('ignores a half explicit pair and oversized values', () => {
    const oversized = 'x'.repeat(ADD_BY_RSS_CREDENTIAL_MAX_LENGTH + 1);
    expect(resolveAddByRSSFeedUrlCredentials('https://example.com/feed', 'alice', '')).toEqual({
      feedUrl: 'https://example.com/feed',
      credentials: null,
    });
    expect(
      resolveAddByRSSFeedUrlCredentials('https://example.com/feed', 'alice', oversized)
    ).toEqual({ feedUrl: 'https://example.com/feed', credentials: null });
  });

  it('returns null for a non-http(s) URL', () => {
    expect(resolveAddByRSSFeedUrlCredentials('ftp://alice:pw@example.com/feed')).toBeNull();
  });
});

describe('canonicalAddByRSSFeedUrl', () => {
  it('matches the URL stored for a follow row', () => {
    expect(canonicalAddByRSSFeedUrl('  HTTPS://alice:pw@Example.com/feed.xml ')).toBe(
      'https://example.com/feed.xml'
    );
  });

  it('drops a trailing path slash and keeps the host root and the query', () => {
    expect(canonicalAddByRSSFeedUrl('https://example.com/feed/show/')).toBe(
      'https://example.com/feed/show'
    );
    expect(canonicalAddByRSSFeedUrl('https://example.com/feed/show/?a=1')).toBe(
      'https://example.com/feed/show?a=1'
    );
    expect(canonicalAddByRSSFeedUrl('https://example.com/')).toBe('https://example.com/');
  });
});

describe('addByRSSDirectoryMatchUrlVariants', () => {
  const show = [
    'https://example.com/Feed.xml',
    'https://example.com/Feed.xml/',
    'http://example.com/Feed.xml',
    'http://example.com/Feed.xml/',
  ];

  it('lists https then http, without a slash then with one', () => {
    expect(addByRSSDirectoryMatchUrlVariants('http://example.com/Feed.xml')).toEqual(show);
  });

  it('lowercases the host and keeps the path case', () => {
    expect(addByRSSDirectoryMatchUrlVariants('HTTPS://Example.COM/Feed.xml')).toEqual(show);
  });

  it('drops a default port', () => {
    expect(addByRSSDirectoryMatchUrlVariants('https://example.com:443/Feed.xml')).toEqual(show);
    expect(addByRSSDirectoryMatchUrlVariants('http://example.com:80/Feed.xml')).toEqual(show);
  });

  it('drops a fragment', () => {
    expect(addByRSSDirectoryMatchUrlVariants('https://example.com/Feed.xml#episode')).toEqual(show);
  });

  it('treats a trailing slash on a non-root path as the same feed', () => {
    expect(addByRSSDirectoryMatchUrlVariants('https://example.com/Feed.xml/')).toEqual(show);
  });

  it('keeps only the host root for an empty path', () => {
    expect(addByRSSDirectoryMatchUrlVariants('http://example.com')).toEqual([
      'https://example.com/',
      'http://example.com/',
    ]);
    expect(addByRSSDirectoryMatchUrlVariants('https://example.com/')).toEqual([
      'https://example.com/',
      'http://example.com/',
    ]);
  });

  it('keeps the query string', () => {
    expect(addByRSSDirectoryMatchUrlVariants('https://example.com/Feed.xml?a=1')).toEqual([
      'https://example.com/Feed.xml?a=1',
      'https://example.com/Feed.xml/?a=1',
      'http://example.com/Feed.xml?a=1',
      'http://example.com/Feed.xml/?a=1',
    ]);
  });

  it('keeps a www host', () => {
    expect(addByRSSDirectoryMatchUrlVariants('https://www.example.com/Feed.xml')).toEqual([
      'https://www.example.com/Feed.xml',
      'https://www.example.com/Feed.xml/',
      'http://www.example.com/Feed.xml',
      'http://www.example.com/Feed.xml/',
    ]);
  });

  it('returns nothing when the URL has userinfo', () => {
    expect(addByRSSDirectoryMatchUrlVariants('https://alice:pw@example.com/Feed.xml')).toEqual([]);
    expect(addByRSSDirectoryMatchUrlVariants('https://alice@example.com/Feed.xml')).toEqual([]);
  });

  it('returns nothing for an invalid or non-http URL', () => {
    expect(addByRSSDirectoryMatchUrlVariants('not-a-url')).toEqual([]);
    expect(addByRSSDirectoryMatchUrlVariants('ftp://example.com/Feed.xml')).toEqual([]);
  });
});

describe('canSubmitAddByRssFeed', () => {
  it('allows a valid URL with credentials off', () => {
    expect(
      canSubmitAddByRssFeed({
        feedUrl: 'https://example.com/feed.xml',
        password: '',
        requireCredentials: false,
        username: '',
      })
    ).toBe(true);
  });

  it('rejects an invalid URL', () => {
    expect(
      canSubmitAddByRssFeed({
        feedUrl: 'not-a-url',
        password: '',
        requireCredentials: false,
        username: '',
      })
    ).toBe(false);
  });

  it('requires both credential fields when the toggle is on', () => {
    expect(
      canSubmitAddByRssFeed({
        feedUrl: 'https://example.com/feed.xml',
        password: '',
        requireCredentials: true,
        username: 'alice',
      })
    ).toBe(false);
    expect(
      canSubmitAddByRssFeed({
        feedUrl: 'https://example.com/feed.xml',
        password: 'secret',
        requireCredentials: true,
        username: 'alice',
      })
    ).toBe(true);
  });
});

describe('canSubmitAddByRssCredentials', () => {
  it('requires a trimmed username and a non-empty password within length', () => {
    expect(canSubmitAddByRssCredentials('  alice  ', 'secret')).toBe(true);
    expect(canSubmitAddByRssCredentials('   ', 'secret')).toBe(false);
    expect(canSubmitAddByRssCredentials('alice', '')).toBe(false);
    expect(
      canSubmitAddByRssCredentials('alice', 'x'.repeat(ADD_BY_RSS_CREDENTIAL_MAX_LENGTH + 1))
    ).toBe(false);
  });
});
