import { describe, expect, it } from 'vitest';

import { parseSpamFeedItemThresholdEnv } from './buildWorkersParserConfig.js';

describe('parseSpamFeedItemThresholdEnv', () => {
  it('returns default when raw is undefined', () => {
    expect(parseSpamFeedItemThresholdEnv('VAR', undefined, 42)).toBe(42);
  });

  it('returns default when raw is blank', () => {
    expect(parseSpamFeedItemThresholdEnv('VAR', '', 42)).toBe(42);
    expect(parseSpamFeedItemThresholdEnv('VAR', '   ', 42)).toBe(42);
  });

  it('parses a positive integer', () => {
    expect(parseSpamFeedItemThresholdEnv('VAR', '10000', 1)).toBe(10000);
    expect(parseSpamFeedItemThresholdEnv('VAR', '  7  ', 1)).toBe(7);
  });

  it('throws when value is not a positive integer', () => {
    expect(() => parseSpamFeedItemThresholdEnv('VAR', '0', 1)).toThrow(/VAR/);
    expect(() => parseSpamFeedItemThresholdEnv('VAR', '-1', 1)).toThrow(/VAR/);
    expect(() => parseSpamFeedItemThresholdEnv('VAR', 'abc', 1)).toThrow(/VAR/);
  });
});
