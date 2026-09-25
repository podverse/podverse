import { describe, expect, it } from 'vitest';

import {
  resolveCredentialScope,
  resolveCredentialScopeHost,
  splitFeedUrlUserinfo,
} from './credentialScope.js';

describe('resolveCredentialScopeHost', () => {
  it.each([
    ['subdomain feed', 'https://feeds.example.co.uk/f', { host: 'example.co.uk', match: 'domain' }],
    ['apex feed', 'https://Example.com/f', { host: 'example.com', match: 'domain' }],
    [
      'private suffix tenant',
      'https://alice.github.io/feed.xml',
      { host: 'alice.github.io', match: 'domain' },
    ],
    ['IPv4 literal', 'http://127.0.0.1:2111/feed', { host: '127.0.0.1', match: 'exact' }],
    ['IPv6 literal', 'https://[::1]/feed', { host: '::1', match: 'exact' }],
    ['localhost', 'http://localhost:2111/feed', { host: 'localhost', match: 'exact' }],
  ])('%s', (_label, feedUrl, expected) => {
    expect(resolveCredentialScopeHost(feedUrl)).toEqual(expected);
  });

  it('returns null for unparseable or non-http(s) feed URLs', () => {
    expect(resolveCredentialScopeHost('not a url')).toBeNull();
    expect(resolveCredentialScopeHost('ftp://example.com/feed')).toBeNull();
  });
});

describe('resolveCredentialScope', () => {
  it.each([
    ['same host', 'https://example.com/feed.xml', 'https://example.com/ep1.mp3', 'send'],
    ['host case differs', 'https://Example.com/feed.xml', 'https://EXAMPLE.com/a.mp3', 'send'],
    ['sibling subdomain', 'https://feeds.example.com/f', 'https://media.example.com/a', 'send'],
    ['apex to subdomain', 'https://example.com/f', 'https://cdn.example.com/a', 'send'],
    ['multi-part suffix', 'https://feeds.example.co.uk/f', 'https://m.example.co.uk/a', 'send'],
    ['port differs', 'https://example.com/f', 'https://example.com:8443/a', 'send'],
    [
      'other registrable domain',
      'https://example.com/f',
      'https://cdn.other.com/a',
      'withheld_other_domain',
    ],
    [
      'lookalike suffix',
      'https://example.com/f',
      'https://example.com.evil.net/a',
      'withheld_other_domain',
    ],
    [
      'sibling under shared public suffix',
      'https://a.example.co.uk/f',
      'https://b.other.co.uk/a',
      'withheld_other_domain',
    ],
    [
      'tenants on a private hosting suffix',
      'https://alice.github.io/feed.xml',
      'https://bob.github.io/a.mp3',
      'withheld_other_domain',
    ],
  ])('%s', (_label, feedUrl, targetUrl, expected) => {
    expect(resolveCredentialScope(feedUrl, targetUrl)).toBe(expected);
  });

  describe('IP literals and localhost', () => {
    it('sends when IPv4 hosts match exactly', () => {
      expect(resolveCredentialScope('https://10.0.0.5/feed', 'https://10.0.0.5:9000/a.mp3')).toBe(
        'send'
      );
    });

    it('withholds when IPv4 hosts differ', () => {
      expect(resolveCredentialScope('https://10.0.0.5/feed', 'https://10.0.0.6/a.mp3')).toBe(
        'withheld_other_domain'
      );
    });

    it('sends when IPv6 hosts match exactly', () => {
      expect(resolveCredentialScope('https://[::1]/feed', 'https://[::1]:2111/a.mp3')).toBe('send');
    });

    it('withholds between an IP literal and a named host', () => {
      expect(resolveCredentialScope('https://example.com/feed', 'https://93.184.216.34/a')).toBe(
        'withheld_other_domain'
      );
    });

    it('treats localhost subdomains as exact-match hosts', () => {
      expect(resolveCredentialScope('https://localhost/f', 'https://localhost:2111/a')).toBe(
        'send'
      );
      expect(resolveCredentialScope('https://a.localhost/f', 'https://b.localhost/a')).toBe(
        'withheld_other_domain'
      );
      expect(resolveCredentialScope('https://localhost/f', 'https://127.0.0.1/a')).toBe(
        'withheld_other_domain'
      );
    });
  });

  describe('insecure transport', () => {
    it('withholds when the target is http', () => {
      expect(resolveCredentialScope('https://example.com/f', 'http://example.com/a')).toBe(
        'withheld_insecure'
      );
    });

    it('withholds when the feed is http', () => {
      expect(resolveCredentialScope('http://example.com/f', 'https://example.com/a')).toBe(
        'withheld_insecure'
      );
    });

    it('withholds http when allowInsecure is not exactly true', () => {
      expect(
        resolveCredentialScope('http://localhost:2111/f', 'http://localhost:2111/a', {
          allowInsecure: false,
        })
      ).toBe('withheld_insecure');
    });

    it('sends over http with allowInsecure when hosts are in scope', () => {
      expect(
        resolveCredentialScope('http://localhost:2111/f', 'http://localhost:2111/a', {
          allowInsecure: true,
        })
      ).toBe('send');
    });

    it('still applies domain scope with allowInsecure', () => {
      expect(
        resolveCredentialScope('http://example.com/f', 'http://other.com/a', {
          allowInsecure: true,
        })
      ).toBe('withheld_other_domain');
    });

    it('withholds non-http(s) protocols even with allowInsecure', () => {
      expect(
        resolveCredentialScope('https://example.com/f', 'ftp://example.com/a', {
          allowInsecure: true,
        })
      ).toBe('withheld_insecure');
    });
  });

  it('withholds when either URL is invalid', () => {
    expect(resolveCredentialScope('not a url', 'https://example.com/a')).toBe(
      'withheld_other_domain'
    );
    expect(resolveCredentialScope('https://example.com/f', '')).toBe('withheld_other_domain');
  });
});

describe('splitFeedUrlUserinfo', () => {
  it('strips userinfo into separate decoded fields', () => {
    const result = splitFeedUrlUserinfo('https://alice:s%40cret%3A1@feeds.example.com/private.xml');
    expect(result).toEqual({
      feedUrl: 'https://feeds.example.com/private.xml',
      username: 'alice',
      password: 's@cret:1',
    });
  });

  it('returns a username with a null password when only a username is present', () => {
    expect(splitFeedUrlUserinfo('https://alice@example.com/feed')).toEqual({
      feedUrl: 'https://example.com/feed',
      username: 'alice',
      password: null,
    });
  });

  it('drops empty userinfo without returning credentials', () => {
    expect(splitFeedUrlUserinfo('https://:@example.com/feed')).toEqual({
      feedUrl: 'https://example.com/feed',
      username: null,
      password: null,
    });
  });

  it('leaves a clean URL unchanged with null credentials', () => {
    expect(splitFeedUrlUserinfo('  https://example.com/feed.xml?x=1  ')).toEqual({
      feedUrl: 'https://example.com/feed.xml?x=1',
      username: null,
      password: null,
    });
  });

  it('keeps malformed percent-encoding as typed', () => {
    expect(splitFeedUrlUserinfo('https://al%ZZice:pw@example.com/feed').username).toBe('al%ZZice');
  });

  it('returns trimmed input with null credentials when the URL cannot be parsed', () => {
    expect(splitFeedUrlUserinfo('  not a url  ')).toEqual({
      feedUrl: 'not a url',
      username: null,
      password: null,
    });
  });

  it('does not touch non-http(s) URLs', () => {
    expect(splitFeedUrlUserinfo('ftp://user:pw@example.com/feed')).toEqual({
      feedUrl: 'ftp://user:pw@example.com/feed',
      username: null,
      password: null,
    });
  });
});
