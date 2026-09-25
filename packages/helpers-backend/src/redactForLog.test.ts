import { describe, expect, it } from 'vitest';

import { isSensitiveLogKey, redactForLog } from './redactForLog.js';

describe('isSensitiveLogKey', () => {
  it('treats common secret key names as sensitive (case-insensitive)', () => {
    expect(isSensitiveLogKey('Password')).toBe(true);
    expect(isSensitiveLogKey('api_key')).toBe(true);
    expect(isSensitiveLogKey('Access-Token')).toBe(true);
  });

  it('does not mark arbitrary field names as sensitive', () => {
    expect(isSensitiveLogKey('title')).toBe(false);
    expect(isSensitiveLogKey('author')).toBe(false);
    expect(isSensitiveLogKey('username')).toBe(false);
    expect(isSensitiveLogKey('credentialsState')).toBe(false);
    expect(isSensitiveLogKey('requires_credentials')).toBe(false);
  });

  it('treats add-by-RSS credential keys as sensitive in snake_case and camelCase', () => {
    for (const key of [
      'basic_auth_username',
      'basicAuthUsername',
      'basic_auth_password',
      'basicAuthPassword',
      'credentials',
      'credentials_by_url',
      'credentialsByUrl',
      'credentials_envelope',
      'credentialsEnvelope',
    ]) {
      expect(isSensitiveLogKey(key)).toBe(true);
    }
  });

  it('keeps matching camelCase keys that were already sensitive as one word', () => {
    expect(isSensitiveLogKey('secretKey')).toBe(true);
    expect(isSensitiveLogKey('authKey')).toBe(true);
    expect(isSensitiveLogKey('userPassword')).toBe(true);
  });
});

describe('redactForLog', () => {
  it('redacts sensitive keys in nested objects and mixed-case key names', () => {
    const input = {
      title: 'ok',
      basic_auth_password: 'leak',
      User_Secret: 'leak',
      nest: {
        API_KEY: 'k',
        safe: 'x',
        items: [{ token: 't' }, { name: 'n' }],
      },
    };

    const out = redactForLog(input as Record<string, unknown>);

    expect(out.title).toBe('ok');
    expect(out.basic_auth_password).toBe('[REDACTED]');
    expect(out.User_Secret).toBe('[REDACTED]');
    expect((out.nest as Record<string, unknown>).API_KEY).toBe('[REDACTED]');
    expect((out.nest as Record<string, unknown>).safe).toBe('x');
    const items = (out.nest as Record<string, unknown>).items as Record<string, unknown>[];
    expect(items[0]?.token).toBe('[REDACTED]');
    expect(items[1]?.name).toBe('n');
  });

  it('redacts add-by-RSS credential fields in a parse request or MQ body', () => {
    const out = redactForLog({
      feed_url: 'https://feeds.example.com/private.xml',
      basic_auth_username: 'alice',
      basic_auth_password: 'pw',
      credentialsEnvelope: 't1:abc',
      credentials_by_url: { 'https://feeds.example.com/private.xml': { password: 'pw' } },
      credentials: { username: 'alice', password: 'pw' },
    });

    expect(out.feed_url).toBe('https://feeds.example.com/private.xml');
    expect(out.basic_auth_username).toBe('[REDACTED]');
    expect(out.basic_auth_password).toBe('[REDACTED]');
    expect(out.credentialsEnvelope).toBe('[REDACTED]');
    expect(out.credentials_by_url).toBe('[REDACTED]');
    expect(out.credentials).toBe('[REDACTED]');
  });
});
