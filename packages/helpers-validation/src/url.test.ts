import { describe, expect, it } from 'vitest';

import { canonicalHttpOrHttpsUrl } from './url.js';

describe('canonicalHttpOrHttpsUrl', () => {
  it('returns canonical href for a valid https URL', () => {
    expect(canonicalHttpOrHttpsUrl('https://example.com/feed.rss')).toBe(
      'https://example.com/feed.rss'
    );
  });

  it('returns canonical href for a valid http URL', () => {
    expect(canonicalHttpOrHttpsUrl('http://example.com/feed.rss')).toBe(
      'http://example.com/feed.rss'
    );
  });

  it('encodes raw spaces in the URL path', () => {
    expect(canonicalHttpOrHttpsUrl('https://example.com/my feed.rss')).toBe(
      'https://example.com/my%20feed.rss'
    );
  });

  it('encodes raw spaces in the URL query string', () => {
    expect(canonicalHttpOrHttpsUrl('https://example.com/feed?name=my feed')).toBe(
      'https://example.com/feed?name=my%20feed'
    );
  });

  it('leaves already percent-encoded URLs unchanged', () => {
    expect(canonicalHttpOrHttpsUrl('https://example.com/my%20feed.rss')).toBe(
      'https://example.com/my%20feed.rss'
    );
  });

  it('trims leading and trailing whitespace before parsing', () => {
    expect(canonicalHttpOrHttpsUrl('  https://example.com/feed.rss  ')).toBe(
      'https://example.com/feed.rss'
    );
  });

  it('returns null for an empty string', () => {
    expect(canonicalHttpOrHttpsUrl('')).toBeNull();
  });

  it('returns null for a whitespace-only string', () => {
    expect(canonicalHttpOrHttpsUrl('   ')).toBeNull();
  });

  it('returns null for a non-http(s) scheme', () => {
    expect(canonicalHttpOrHttpsUrl('ftp://example.com/feed.rss')).toBeNull();
  });

  it('returns null for a malformed URL that cannot be repaired', () => {
    expect(canonicalHttpOrHttpsUrl('not-a-url')).toBeNull();
  });

  it('returns null for a URL with no hostname', () => {
    expect(canonicalHttpOrHttpsUrl('https://')).toBeNull();
  });
});
