import { describe, expect, it } from 'vitest';

import { parseCookieJsonObject, serializeCookieJsonObject } from './cookieJson';

describe('parseCookieJsonObject', () => {
  it('returns empty object for undefined or empty input', () => {
    expect(parseCookieJsonObject(undefined)).toEqual({});
    expect(parseCookieJsonObject('')).toEqual({});
  });

  it('parses JSON objects', () => {
    expect(parseCookieJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it('decodes percent-encoded payloads before parsing', () => {
    const encoded = encodeURIComponent('{"x":"y"}');
    expect(parseCookieJsonObject(encoded)).toEqual({ x: 'y' });
  });

  it('returns empty object for invalid JSON', () => {
    expect(parseCookieJsonObject('{not json')).toEqual({});
  });

  it('returns empty object for non-object JSON', () => {
    expect(parseCookieJsonObject('"string"')).toEqual({});
    expect(parseCookieJsonObject('[1,2]')).toEqual({});
  });
});

describe('serializeCookieJsonObject', () => {
  it('stringifies maps for cookie storage', () => {
    expect(serializeCookieJsonObject({ k: { nested: true } })).toBe('{"k":{"nested":true}}');
  });
});
