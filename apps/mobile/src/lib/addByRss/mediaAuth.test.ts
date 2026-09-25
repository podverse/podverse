import { describe, expect, it } from 'vitest';

import {
  decideAddByRssHeaderAuth,
  decideAddByRssPlaybackAuth,
  encodeBasicAuthorization,
} from './mediaAuth';

const credentials = { password: 'pässword', username: 'listener' };
const feedUrl = 'https://feeds.example.com/private.xml';

describe('decideAddByRssPlaybackAuth', () => {
  it('passes scoped basicAuth for media on the feed domain', () => {
    expect(
      decideAddByRssPlaybackAuth({
        allowInsecure: false,
        credentials,
        feedUrl,
        mediaUrl: 'https://media.example.com/ep1.mp3',
      })
    ).toEqual({
      basicAuth: {
        allowInsecure: false,
        password: 'pässword',
        scopeHost: 'example.com',
        scopeMatch: 'domain',
        username: 'listener',
      },
      state: 'sent',
    });
  });

  it('withholds credentials from another domain and from plain http', () => {
    const base = { allowInsecure: false, credentials, feedUrl };
    const otherDomain = decideAddByRssPlaybackAuth({
      ...base,
      mediaUrl: 'https://cdn.other.com/a.mp3',
    });
    expect(otherDomain).toEqual({ basicAuth: null, state: 'withheld_other_domain' });
    const insecure = decideAddByRssPlaybackAuth({
      ...base,
      mediaUrl: 'http://media.example.com/a.mp3',
    });
    expect(insecure).toEqual({ basicAuth: null, state: 'withheld_insecure' });
  });

  it('uses an exact scope for loopback test-assets when insecure is allowed', () => {
    expect(
      decideAddByRssPlaybackAuth({
        allowInsecure: true,
        credentials,
        feedUrl: 'http://127.0.0.1:2111/basic-auth/feed.xml',
        mediaUrl: 'http://127.0.0.1:2111/basic-auth/ep.mp3',
      }).basicAuth
    ).toMatchObject({ allowInsecure: true, scopeHost: '127.0.0.1', scopeMatch: 'exact' });
  });

  it('sends nothing without stored credentials or for local files', () => {
    expect(
      decideAddByRssPlaybackAuth({
        allowInsecure: false,
        credentials: null,
        feedUrl,
        mediaUrl: 'https://media.example.com/a.mp3',
      }).state
    ).toBe('not_stored');
    expect(
      decideAddByRssPlaybackAuth({
        allowInsecure: false,
        credentials,
        feedUrl,
        mediaUrl: 'file:///downloads/a.mp3',
      }).state
    ).toBe('not_remote');
  });
});

describe('decideAddByRssHeaderAuth', () => {
  const base = {
    allowInsecure: false,
    credentials,
    feedUrl,
    mediaUrl: 'https://media.example.com/a.mp3',
  };

  it('attaches Authorization on Android for in-scope URLs', () => {
    expect(decideAddByRssHeaderAuth({ ...base, platform: 'android' })).toEqual({
      headers: { Authorization: encodeBasicAuthorization(credentials) },
      state: 'sent',
    });
  });

  it('withholds on iOS and for out-of-scope URLs', () => {
    expect(decideAddByRssHeaderAuth({ ...base, platform: 'ios' })).toEqual({
      headers: null,
      state: 'withheld_unverified_platform',
    });
    expect(
      decideAddByRssHeaderAuth({
        ...base,
        mediaUrl: 'https://cdn.other.com/a.mp3',
        platform: 'android',
      })
    ).toEqual({ headers: null, state: 'withheld_other_domain' });
  });
});

describe('encodeBasicAuthorization', () => {
  it('base64-encodes UTF-8 user:password', () => {
    expect(encodeBasicAuthorization({ password: 'pw', username: 'user' })).toBe(
      'Basic dXNlcjpwdw=='
    );
    expect(encodeBasicAuthorization({ password: 'ä', username: 'u' })).toBe('Basic dTrDpA==');
  });
});
