import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MAX_FEED_BODY_BYTES,
  parseOptionalParserMaxFeedBodyBytes,
  resolveParserMaxFeedBodyBytes,
} from './parserMaxFeedBodyBytes.js';

describe('parseOptionalParserMaxFeedBodyBytes', () => {
  it('returns null for empty values', () => {
    expect(parseOptionalParserMaxFeedBodyBytes(undefined)).toBeNull();
    expect(parseOptionalParserMaxFeedBodyBytes(null)).toBeNull();
    expect(parseOptionalParserMaxFeedBodyBytes('')).toBeNull();
    expect(parseOptionalParserMaxFeedBodyBytes('   ')).toBeNull();
  });

  it('parses valid integers within bounds', () => {
    expect(parseOptionalParserMaxFeedBodyBytes('1000')).toBe(1000);
    expect(parseOptionalParserMaxFeedBodyBytes('50000000')).toBe(50000000);
    expect(parseOptionalParserMaxFeedBodyBytes('  1048576 ')).toBe(1048576);
  });

  it('throws for invalid or out-of-range values', () => {
    expect(() => parseOptionalParserMaxFeedBodyBytes('999')).toThrow(/PARSER_MAX_FEED_BODY_BYTES/);
    expect(() => parseOptionalParserMaxFeedBodyBytes('50000001')).toThrow(
      /PARSER_MAX_FEED_BODY_BYTES/
    );
    expect(() => parseOptionalParserMaxFeedBodyBytes('abc')).toThrow(/PARSER_MAX_FEED_BODY_BYTES/);
  });
});

describe('resolveParserMaxFeedBodyBytes', () => {
  it('returns default when unset', () => {
    expect(resolveParserMaxFeedBodyBytes(undefined)).toBe(DEFAULT_MAX_FEED_BODY_BYTES);
  });

  it('returns parsed value when set', () => {
    expect(resolveParserMaxFeedBodyBytes('12345')).toBe(12345);
  });
});
