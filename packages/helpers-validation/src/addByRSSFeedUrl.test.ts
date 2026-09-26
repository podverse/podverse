import { describe, expect, it } from 'vitest';

import {
  ADD_BY_RSS_CREDENTIAL_MAX_LENGTH,
  canSubmitAddByRssCredentials,
  canSubmitAddByRssFeed,
  canonicalAddByRSSFeedUrl,
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
