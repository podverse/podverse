import { describe, expect, it } from 'vitest';

import {
  metaBoostTagFieldsFromApiDto,
  resolveMetaBoostFromApiValueMetadata,
  resolveMetaBoostFromValueMetadata,
} from './metaBoostStandard.js';

describe('metaBoostTagFieldsFromApiDto', () => {
  it('maps standard+node from API DTO', () => {
    expect(
      metaBoostTagFieldsFromApiDto({
        standard: 'mbrss-v1',
        node: 'https://api.example.com/v1/s/mbrss-v1/boost/abc/',
      })
    ).toEqual({
      standard: 'mbrss-v1',
      node: 'https://api.example.com/v1/s/mbrss-v1/boost/abc/',
    });
  });

  it('returns null when node is missing', () => {
    expect(metaBoostTagFieldsFromApiDto({ standard: 'mbrss-v1', node: '' })).toBeNull();
  });

  it('returns null when standard is missing', () => {
    expect(
      metaBoostTagFieldsFromApiDto({
        node: 'https://api.example.com/v1/s/mbrss-v1/boost/abc/',
      })
    ).toBeNull();
  });
});

describe('resolveMetaBoostFromValueMetadata', () => {
  it('resolves mbrss-v1 from Partytime-shaped tag fields', () => {
    const resolved = resolveMetaBoostFromValueMetadata({
      standard: 'mbrss-v1',
      node: 'https://api.example.com/v1/s/mbrss-v1/boost/abc/',
    });
    expect(resolved).not.toBeNull();
    expect(resolved?.normalizedStandard).toBe('mbrss-v1');
    expect(resolved?.metaBoost.node).toBe('https://api.example.com/v1/s/mbrss-v1/boost/abc/');
  });
});

describe('resolveMetaBoostFromApiValueMetadata', () => {
  it('resolves from API dto', () => {
    const resolved = resolveMetaBoostFromApiValueMetadata({
      standard: 'mbrss-v1',
      node: 'https://api.example.com/v1/s/mbrss-v1/boost/abc/',
    });
    expect(resolved).not.toBeNull();
    expect(resolved?.normalizedStandard).toBe('mbrss-v1');
  });
});
