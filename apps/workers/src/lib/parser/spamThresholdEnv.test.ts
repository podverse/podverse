import { describe, expect, it } from 'vitest';

import {
  normalizeSpamThresholdRaw,
  parseSpamFeedItemThresholdEnv,
  validateSpamFeedItemThresholdEnvVar,
} from './spamThresholdEnv.js';

describe('normalizeSpamThresholdRaw', () => {
  it('strips one pair of surrounding quotes', () => {
    expect(normalizeSpamThresholdRaw('"10000"')).toBe('10000');
    expect(normalizeSpamThresholdRaw("'999'")).toBe('999');
  });
});

describe('parseSpamFeedItemThresholdEnv', () => {
  it('parses quoted positive integers', () => {
    expect(parseSpamFeedItemThresholdEnv('VAR', '"10000"', 1)).toBe(10000);
  });
});

describe('validateSpamFeedItemThresholdEnvVar', () => {
  it('accepts quoted integers when set', () => {
    const prev = process.env.PARSER_SPAM_FEED_ITEM_THRESHOLD_DEFAULT;
    process.env.PARSER_SPAM_FEED_ITEM_THRESHOLD_DEFAULT = '"10000"';
    try {
      const r = validateSpamFeedItemThresholdEnvVar(
        'PARSER_SPAM_FEED_ITEM_THRESHOLD_DEFAULT',
        'Parser',
        'Use Default (10000)'
      );
      expect(r.isValid).toBe(true);
      expect(r.isSet).toBe(true);
    } finally {
      if (prev === undefined) {
        delete process.env.PARSER_SPAM_FEED_ITEM_THRESHOLD_DEFAULT;
      } else {
        process.env.PARSER_SPAM_FEED_ITEM_THRESHOLD_DEFAULT = prev;
      }
    }
  });

  it('rejects zero when set', () => {
    const prev = process.env.PARSER_SPAM_FEED_ITEM_THRESHOLD_DEFAULT;
    process.env.PARSER_SPAM_FEED_ITEM_THRESHOLD_DEFAULT = '0';
    try {
      const r = validateSpamFeedItemThresholdEnvVar(
        'PARSER_SPAM_FEED_ITEM_THRESHOLD_DEFAULT',
        'Parser',
        'Use Default (10000)'
      );
      expect(r.isValid).toBe(false);
    } finally {
      if (prev === undefined) {
        delete process.env.PARSER_SPAM_FEED_ITEM_THRESHOLD_DEFAULT;
      } else {
        process.env.PARSER_SPAM_FEED_ITEM_THRESHOLD_DEFAULT = prev;
      }
    }
  });
});
