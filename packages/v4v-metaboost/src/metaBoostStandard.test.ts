import { describe, expect, it } from 'vitest';

import {
  metaBoostTagFieldsFromApiDto,
  resolveBoostExecutionStrategy,
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

describe('resolveBoostExecutionStrategy', () => {
  it('uses mb-v1 mode when standard is explicitly mb-v1', () => {
    const strategy = resolveBoostExecutionStrategy({
      node: 'https://api.example.com/v1/standard/mb-v1/boost/abc/',
      standard: 'mb-v1',
    });
    expect(strategy.mode).toBe('mb-v1');
    expect(strategy.shouldUseMbV1).toBe(true);
    expect(strategy.shouldUseMbrssV1).toBe(false);
    expect(strategy.allowBlipFallback).toBe(false);
  });

  it('uses mb-v1 mode when node URL contains /standard/mb-v1/', () => {
    const strategy = resolveBoostExecutionStrategy({
      node: 'https://api.example.com/v1/standard/mb-v1/boost/abc/',
    });
    expect(strategy.mode).toBe('mb-v1');
    expect(strategy.shouldUseMbV1).toBe(true);
    expect(strategy.shouldUseMbrssV1).toBe(false);
  });

  it('keeps mbrss-v1 behavior unchanged for mbrss URLs', () => {
    const strategy = resolveBoostExecutionStrategy({
      node: 'https://api.example.com/v1/standard/mbrss-v1/boost/abc/',
      standard: 'mbrss-v1',
    });
    expect(strategy.mode).toBe('mbrss-v1');
    expect(strategy.shouldUseMbrssV1).toBe(true);
    expect(strategy.shouldUseMbV1).toBe(false);
    expect(strategy.allowBlipFallback).toBe(false);
  });

  it('keeps fallback behavior for null metaboost', () => {
    const strategy = resolveBoostExecutionStrategy(null);
    expect(strategy.mode).toBe('fallback');
    expect(strategy.shouldUseMbrssV1).toBe(false);
    expect(strategy.shouldUseMbV1).toBe(false);
    expect(strategy.allowBlipFallback).toBe(true);
  });
});
