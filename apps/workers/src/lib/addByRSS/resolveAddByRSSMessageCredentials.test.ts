import { describe, expect, it } from 'vitest';

import { sealAddByRssCredentials } from '@podverse/helpers-backend';

import { resolveAddByRSSMessageCredentials } from './resolveAddByRSSMessageCredentials.js';

const KEY = 'a'.repeat(64);
const OLD_KEY = 'b'.repeat(64);
const FEED_URL = 'https://feeds.example.com/private.xml';
const NOW = 1_700_000_000_000;

const message = { accountId: 7, requestId: 'req-1', feedUrl: FEED_URL };

const seal = (overrides: Partial<typeof message> = {}, keyHex = KEY, expMs = NOW + 60_000) =>
  sealAddByRssCredentials(
    { ...message, ...overrides, username: 'alice', password: 'hunter2', expMs },
    keyHex
  );

const resolve = (credentialsEnvelope: string | undefined, feedUrl = FEED_URL) =>
  resolveAddByRSSMessageCredentials({
    ...message,
    feedUrl,
    credentialsEnvelope,
    keyHex: KEY,
    keyHexOld: OLD_KEY,
    allowInsecure: false,
    nowMs: NOW,
  });

describe('resolveAddByRSSMessageCredentials', () => {
  it('parses as a public feed when the message has no envelope', () => {
    expect(resolve(undefined)).toEqual({ credentialsState: 'not_provided' });
  });

  it('opens a valid envelope and sends credentials to an in-scope feed', () => {
    expect(resolve(seal())).toEqual({
      credentialsState: 'sent',
      basicAuth: { username: 'alice', password: 'hunter2' },
    });
  });

  it('opens an envelope sealed with the previous key during rotation', () => {
    expect(resolve(seal({}, OLD_KEY)).credentialsState).toBe('sent');
  });

  it('rejects an expired envelope', () => {
    expect(resolve(seal({}, KEY, NOW - 1))).toEqual({ credentialsState: 'decrypt_failed' });
  });

  it('rejects an envelope bound to another request, account, or feed', () => {
    expect(resolve(seal({ requestId: 'req-2' }))).toEqual({ credentialsState: 'decrypt_failed' });
    expect(resolve(seal({ accountId: 8 }))).toEqual({ credentialsState: 'decrypt_failed' });
    expect(resolve(seal({ feedUrl: 'https://feeds.example.com/other.xml' }))).toEqual({
      credentialsState: 'decrypt_failed',
    });
  });

  it('rejects an envelope sealed with an unknown key', () => {
    expect(resolve(seal({}, 'c'.repeat(64)))).toEqual({ credentialsState: 'decrypt_failed' });
  });

  it('withholds opened credentials from an http feed URL', () => {
    const insecureUrl = 'http://feeds.example.com/private.xml';
    expect(resolve(seal({ feedUrl: insecureUrl }), insecureUrl)).toEqual({
      credentialsState: 'withheld_insecure',
    });
  });
});
