import { describe, expect, it } from 'vitest';

import type { FeedParseFailureReason } from '@podverse/helpers';
import { PARSER_MAX_FEED_BODY_BYTES_MAX } from '@podverse/helpers';

import { countMigrationOversizeFeeds, decideMigrationOversize } from './v4MigrationFeedOversize.js';

const MAX_BODY_BYTES = PARSER_MAX_FEED_BODY_BYTES_MAX;

describe('decideMigrationOversize', () => {
  const cases: {
    lastFailureReason: FeedParseFailureReason | null;
    oversizedConditionActive: boolean;
    currentOverride: number | null;
    expected: 'raise' | 'give_up' | 'none';
  }[] = [
    {
      lastFailureReason: null,
      oversizedConditionActive: false,
      currentOverride: null,
      expected: 'none',
    },
    {
      lastFailureReason: 'timeout',
      oversizedConditionActive: false,
      currentOverride: null,
      expected: 'none',
    },
    {
      lastFailureReason: 'body_too_large',
      oversizedConditionActive: false,
      currentOverride: null,
      expected: 'raise',
    },
    {
      lastFailureReason: null,
      oversizedConditionActive: true,
      currentOverride: null,
      expected: 'raise',
    },
    {
      lastFailureReason: 'body_too_large',
      oversizedConditionActive: false,
      currentOverride: 0,
      expected: 'raise',
    },
    {
      lastFailureReason: 'body_too_large',
      oversizedConditionActive: true,
      currentOverride: MAX_BODY_BYTES - 1,
      expected: 'raise',
    },
    {
      lastFailureReason: null,
      oversizedConditionActive: true,
      currentOverride: MAX_BODY_BYTES,
      expected: 'give_up',
    },
    {
      lastFailureReason: 'body_too_large',
      oversizedConditionActive: false,
      currentOverride: MAX_BODY_BYTES,
      expected: 'give_up',
    },
    {
      lastFailureReason: 'body_too_large',
      oversizedConditionActive: true,
      currentOverride: MAX_BODY_BYTES + 1,
      expected: 'give_up',
    },
  ];

  it.each(cases)(
    '$expected when reason=$lastFailureReason oversized=$oversizedConditionActive override=$currentOverride',
    ({ lastFailureReason, oversizedConditionActive, currentOverride, expected }) => {
      expect(
        decideMigrationOversize({
          lastFailureReason,
          oversizedConditionActive,
          currentOverride,
        })
      ).toBe(expected);
    }
  );
});

describe('countMigrationOversizeFeeds', () => {
  it('counts feeds at the maximum by whether the last failure is still body_too_large', () => {
    expect(
      countMigrationOversizeFeeds([
        {
          maxResponseBodyBytesOverride: MAX_BODY_BYTES,
          lastParseFailureReason: null,
        },
        {
          maxResponseBodyBytesOverride: MAX_BODY_BYTES,
          lastParseFailureReason: 'timeout',
        },
        {
          maxResponseBodyBytesOverride: MAX_BODY_BYTES,
          lastParseFailureReason: 'body_too_large',
        },
        {
          maxResponseBodyBytesOverride: null,
          lastParseFailureReason: 'body_too_large',
        },
        {
          maxResponseBodyBytesOverride: MAX_BODY_BYTES - 1,
          lastParseFailureReason: 'body_too_large',
        },
      ])
    ).toEqual({ oversizeRaised: 2, oversizeGaveUp: 1 });
  });
});
