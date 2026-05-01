import { describe, expect, it } from 'vitest';

import {
  isMetaboostMbV1IngestNodeUrl,
  normalizeMetaboostMbV1IngestNodeUrl,
} from './mbV1IngestUrl.js';

describe('normalizeMetaboostMbV1IngestNodeUrl', () => {
  it('accepts mb-v1 boost URLs without rewriting path prefix', () => {
    expect(
      normalizeMetaboostMbV1IngestNodeUrl('https://api.example.com/v1/s/mb-v1/boost/abc/')
    ).toBe('https://api.example.com/v1/s/mb-v1/boost/abc/');
  });

  it('keeps already-standard mb-v1 URLs unchanged', () => {
    const url = 'https://api.example.com/v1/standard/mb-v1/boost/abc/';
    expect(normalizeMetaboostMbV1IngestNodeUrl(url)).toBe(url);
  });

  it('accepts mb-v1 URLs under non-v1 API path segments', () => {
    const url = 'https://api.example.com/v2/standard/mb-v1/boost/abc/';
    expect(normalizeMetaboostMbV1IngestNodeUrl(url)).toBe(url);
  });

  it('throws when URL does not target mb-v1 boost path', () => {
    expect(() =>
      normalizeMetaboostMbV1IngestNodeUrl('https://api.example.com/v1/standard/mbrss-v1/boost/abc/')
    ).toThrow(/mb-v1/i);
  });
});

describe('isMetaboostMbV1IngestNodeUrl', () => {
  it('returns true for mb-v1 ingest URLs', () => {
    expect(
      isMetaboostMbV1IngestNodeUrl('https://api.example.com/v1/standard/mb-v1/boost/abc/')
    ).toBe(true);
    expect(isMetaboostMbV1IngestNodeUrl('https://api.example.com/v1/s/mb-v1/boost/abc/')).toBe(
      true
    );
  });

  it('returns false for non-mb-v1 ingest URLs', () => {
    expect(
      isMetaboostMbV1IngestNodeUrl('https://api.example.com/v1/standard/mbrss-v1/boost/abc/')
    ).toBe(false);
    expect(isMetaboostMbV1IngestNodeUrl('')).toBe(false);
  });
});
