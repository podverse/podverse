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
});
