import { describe, expect, it } from 'vitest';

import {
  getRateLimitWindowSuffixFromKey,
  parseCountPerWindowEnv,
  parseCountPerWindowEnvFromKey,
  RATE_LIMIT_WINDOW_MS_BY_SUFFIX,
} from './parseCountPerWindowEnv.js';

describe('parseCountPerWindowEnv', () => {
  it('maps each supported suffix to its window', () => {
    expect(
      parseCountPerWindowEnv({
        envValue: '5',
        suffix: '_PER_MINUTE',
        defaultMax: 10,
      })
    ).toEqual({ windowMs: 60_000, max: 5 });

    expect(
      parseCountPerWindowEnv({
        envValue: '5',
        suffix: '_PER_10_MINUTES',
        defaultMax: 10,
      })
    ).toEqual({ windowMs: 600_000, max: 5 });

    expect(
      parseCountPerWindowEnv({
        envValue: '5',
        suffix: '_PER_HOUR',
        defaultMax: 10,
      })
    ).toEqual({ windowMs: 3_600_000, max: 5 });

    expect(
      parseCountPerWindowEnv({
        envValue: '5',
        suffix: '_PER_DAY',
        defaultMax: 10,
      })
    ).toEqual({ windowMs: 86_400_000, max: 5 });
  });

  it('uses default max for unset, blank, invalid, and non-positive values', () => {
    expect(
      parseCountPerWindowEnv({
        envValue: undefined,
        suffix: '_PER_HOUR',
        defaultMax: 20,
      }).max
    ).toBe(20);

    expect(
      parseCountPerWindowEnv({
        envValue: '   ',
        suffix: '_PER_HOUR',
        defaultMax: 20,
      }).max
    ).toBe(20);

    expect(
      parseCountPerWindowEnv({
        envValue: 'not-a-number',
        suffix: '_PER_HOUR',
        defaultMax: 20,
      }).max
    ).toBe(20);

    expect(
      parseCountPerWindowEnv({
        envValue: '0',
        suffix: '_PER_HOUR',
        defaultMax: 20,
      }).max
    ).toBe(20);
  });
});

describe('parseCountPerWindowEnvFromKey', () => {
  it('derives suffix and window from the env key', () => {
    expect(
      parseCountPerWindowEnvFromKey({
        key: 'ACCOUNT_OPML_IMPORT_ENQUEUE_MAX_PER_HOUR',
        envValue: '11',
        defaultMax: 10,
      })
    ).toEqual({
      suffix: '_PER_HOUR',
      windowMs: RATE_LIMIT_WINDOW_MS_BY_SUFFIX._PER_HOUR,
      max: 11,
    });
  });

  it('throws for unknown suffixes', () => {
    expect(() =>
      parseCountPerWindowEnvFromKey({
        key: 'ACCOUNT_OPML_IMPORT_ENQUEUE_MAX_PER_WEEK',
        envValue: '11',
        defaultMax: 10,
      })
    ).toThrow('Unsupported rate-limit env suffix');
  });
});

describe('getRateLimitWindowSuffixFromKey', () => {
  it('returns undefined when no allowed suffix is present', () => {
    expect(getRateLimitWindowSuffixFromKey('ACCOUNT_OPML_IMPORT_ENQUEUE_MAX')).toBeUndefined();
  });
});
