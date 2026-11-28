import { describe, expect, it } from 'vitest';

import {
  COOKIE_WRITE_INTENT_HEADER,
  COOKIE_WRITE_INTENT_VALUE,
  cookieAuthenticatedWriteLacksIntent,
  isUnsafeHttpMethod,
} from './cookieWriteIntent.js';

describe('cookie write intent', () => {
  it('names the header and the only accepted value', () => {
    expect(COOKIE_WRITE_INTENT_HEADER).toBe('X-Podverse-Request-Intent');
    expect(COOKIE_WRITE_INTENT_VALUE).toBe('same-origin');
  });

  it('treats POST, PUT, PATCH, and DELETE as unsafe', () => {
    expect(isUnsafeHttpMethod('post')).toBe(true);
    expect(isUnsafeHttpMethod('PUT')).toBe(true);
    expect(isUnsafeHttpMethod('Patch')).toBe(true);
    expect(isUnsafeHttpMethod('DELETE')).toBe(true);
    expect(isUnsafeHttpMethod('GET')).toBe(false);
    expect(isUnsafeHttpMethod('HEAD')).toBe(false);
  });

  it('requires the exact value on an unsafe method', () => {
    expect(cookieAuthenticatedWriteLacksIntent('POST', undefined)).toBe(true);
    expect(cookieAuthenticatedWriteLacksIntent('DELETE', 'cross-site')).toBe(true);
    expect(cookieAuthenticatedWriteLacksIntent('PATCH', COOKIE_WRITE_INTENT_VALUE)).toBe(false);
    expect(cookieAuthenticatedWriteLacksIntent('GET', undefined)).toBe(false);
    expect(cookieAuthenticatedWriteLacksIntent('HEAD', undefined)).toBe(false);
  });
});
