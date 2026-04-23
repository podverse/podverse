import { describe, expect, it } from 'vitest';

import { normalizeMetaboostMbrssV1IngestNodeUrl } from './mbrssV1IngestUrl.js';

describe('normalizeMetaboostMbrssV1IngestNodeUrl', () => {
  it('rewrites legacy /v1/s/ to /v1/standard/', () => {
    expect(
      normalizeMetaboostMbrssV1IngestNodeUrl('https://api.example.com/v1/s/mbrss-v1/boost/abc/')
    ).toBe('https://api.example.com/v1/standard/mbrss-v1/boost/abc/');
  });

  it('leaves already-standard URLs unchanged', () => {
    const u = 'https://api.example.com/v1/standard/mbrss-v1/boost/abc/';
    expect(normalizeMetaboostMbrssV1IngestNodeUrl(u)).toBe(u);
  });

  it('throws on empty string', () => {
    expect(() => normalizeMetaboostMbrssV1IngestNodeUrl('')).toThrow(/empty/);
  });
});
