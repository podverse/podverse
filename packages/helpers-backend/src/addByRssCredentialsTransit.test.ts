import { createCipheriv, randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  ADD_BY_RSS_CREDENTIALS_TRANSIT_TTL_MS,
  isAddByRssCredentialsKeyHexValid,
  openAddByRssCredentials,
  sealAddByRssCredentials,
} from './addByRssCredentialsTransit.js';

const KEY_A = 'a'.repeat(64);
const KEY_B = 'b'.repeat(64);
const NOW_MS = 1_800_000_000_000;

const AAD = {
  accountId: 42,
  requestId: 'req-123',
  feedUrl: 'https://feeds.example.com/private.xml',
};

const sealDefault = (keyHex = KEY_A, expMs = NOW_MS + 60_000): string =>
  sealAddByRssCredentials({ ...AAD, username: 'alice', password: 'p@ss:word', expMs }, keyHex);

/** Builds a `t1:` envelope around an arbitrary plaintext, for malformed-payload cases. */
const sealRawPlaintext = (plaintext: string, keyHex = KEY_A): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), iv, {
    authTagLength: 16,
  });
  cipher.setAAD(Buffer.from(`${AAD.accountId}|${AAD.requestId}|${AAD.feedUrl}`, 'utf8'));
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `t1:${Buffer.concat([iv, encrypted, cipher.getAuthTag()]).toString('base64')}`;
};

describe('addByRssCredentialsTransit', () => {
  it('seals to a t1 envelope that opens with matching associated data', () => {
    const envelope = sealDefault();

    expect(envelope.startsWith('t1:')).toBe(true);
    expect(envelope).not.toContain('alice');
    expect(openAddByRssCredentials(envelope, KEY_A, AAD, { nowMs: NOW_MS })).toEqual({
      username: 'alice',
      password: 'p@ss:word',
    });
  });

  it('uses a fresh IV per seal', () => {
    expect(sealDefault()).not.toBe(sealDefault());
  });

  it.each([
    ['accountId', { ...AAD, accountId: 43 }],
    ['requestId', { ...AAD, requestId: 'req-124' }],
    ['feedUrl', { ...AAD, feedUrl: 'https://feeds.example.com/other.xml' }],
  ])('returns null when %s does not match', (_field, aad) => {
    expect(openAddByRssCredentials(sealDefault(), KEY_A, aad, { nowMs: NOW_MS })).toBeNull();
  });

  it('returns null once exp has passed', () => {
    const envelope = sealDefault(KEY_A, NOW_MS + 1000);

    expect(openAddByRssCredentials(envelope, KEY_A, AAD, { nowMs: NOW_MS + 999 })).not.toBeNull();
    expect(openAddByRssCredentials(envelope, KEY_A, AAD, { nowMs: NOW_MS + 1000 })).toBeNull();
  });

  it('defaults exp to the transit TTL', () => {
    const envelope = sealAddByRssCredentials({ ...AAD, username: 'u', password: 'p' }, KEY_A);
    const now = Date.now();

    expect(openAddByRssCredentials(envelope, KEY_A, AAD, { nowMs: now })).not.toBeNull();
    expect(
      openAddByRssCredentials(envelope, KEY_A, AAD, {
        nowMs: now + ADD_BY_RSS_CREDENTIALS_TRANSIT_TTL_MS + 1000,
      })
    ).toBeNull();
  });

  it('falls back to keyHexOld during rotation', () => {
    const envelope = sealDefault(KEY_B);

    expect(openAddByRssCredentials(envelope, KEY_A, AAD, { nowMs: NOW_MS })).toBeNull();
    expect(
      openAddByRssCredentials(envelope, KEY_A, AAD, { nowMs: NOW_MS, keyHexOld: KEY_B })
    ).toEqual({ username: 'alice', password: 'p@ss:word' });
  });

  it('returns null for a wrong prefix, tampered ciphertext, or truncated input', () => {
    const envelope = sealDefault();
    const body = Buffer.from(envelope.slice(3), 'base64');
    body[body.length - 1] = (body[body.length - 1] ?? 0) ^ 0xff;

    expect(openAddByRssCredentials(`v1:${envelope.slice(3)}`, KEY_A, AAD)).toBeNull();
    expect(openAddByRssCredentials(`t1:${body.toString('base64')}`, KEY_A, AAD)).toBeNull();
    expect(openAddByRssCredentials('t1:', KEY_A, AAD)).toBeNull();
    expect(openAddByRssCredentials('plain-text', KEY_A, AAD)).toBeNull();
  });

  it('returns null when the opening key is invalid', () => {
    expect(openAddByRssCredentials(sealDefault(), 'short', AAD, { nowMs: NOW_MS })).toBeNull();
  });

  it.each([
    ['missing exp', JSON.stringify({ username: 'u', password: 'p' })],
    ['empty username', JSON.stringify({ username: '', password: 'p', exp: NOW_MS + 1000 })],
    ['empty password', JSON.stringify({ username: 'u', password: '', exp: NOW_MS + 1000 })],
    ['non-JSON', 'not json'],
  ])('returns null for a payload with %s', (_label, plaintext) => {
    expect(
      openAddByRssCredentials(sealRawPlaintext(plaintext), KEY_A, AAD, { nowMs: NOW_MS })
    ).toBeNull();
  });

  it('refuses to seal with an invalid key or empty credentials', () => {
    expect(() =>
      sealAddByRssCredentials({ ...AAD, username: 'u', password: 'p' }, 'a'.repeat(62))
    ).toThrow();
    expect(() =>
      sealAddByRssCredentials({ ...AAD, username: 'u', password: 'p' }, 'z'.repeat(64))
    ).toThrow();
    expect(() => sealAddByRssCredentials({ ...AAD, username: '', password: 'p' }, KEY_A)).toThrow();
    expect(() => sealAddByRssCredentials({ ...AAD, username: 'u', password: '' }, KEY_A)).toThrow();
  });

  it('validates key hex length and characters', () => {
    expect(isAddByRssCredentialsKeyHexValid(KEY_A)).toBe(true);
    expect(isAddByRssCredentialsKeyHexValid('A'.repeat(64))).toBe(true);
    expect(isAddByRssCredentialsKeyHexValid('a'.repeat(63))).toBe(false);
    expect(isAddByRssCredentialsKeyHexValid('g'.repeat(64))).toBe(false);
    expect(isAddByRssCredentialsKeyHexValid(undefined)).toBe(false);
  });
});
