import { FeedConditionTypeKeyEnum } from '@orm/entities/feed/feedConditionType.js';
import { describe, expect, it } from 'vitest';

import {
  checkIfSpamFeed,
  DEFAULT_SPAM_FEED_ITEM_THRESHOLDS,
  resolveSpamFeedItemThresholds,
} from './feedSpamThresholds.js';

describe('feedSpamThresholds', () => {
  const t = DEFAULT_SPAM_FEED_ITEM_THRESHOLDS;

  describe('checkIfSpamFeed', () => {
    it('uses default threshold without spam_permitted condition', () => {
      expect(checkIfSpamFeed({ items: new Array(10_000), podcastLiveItems: [] }, [], t)).toBe(true);
      expect(checkIfSpamFeed({ items: new Array(9_999), podcastLiveItems: [] }, [], t)).toBe(false);
    });

    it('uses spam-permitted threshold when spam_permitted is active', () => {
      expect(
        checkIfSpamFeed(
          { items: new Array(100_000), podcastLiveItems: [] },
          [FeedConditionTypeKeyEnum.SpamPermitted],
          t
        )
      ).toBe(true);
      expect(
        checkIfSpamFeed(
          { items: new Array(99_999), podcastLiveItems: [] },
          [FeedConditionTypeKeyEnum.SpamPermitted],
          t
        )
      ).toBe(false);
      expect(
        checkIfSpamFeed(
          { items: [], podcastLiveItems: new Array(100_000) },
          [FeedConditionTypeKeyEnum.SpamPermitted],
          t
        )
      ).toBe(true);
      expect(
        checkIfSpamFeed(
          { items: [], podcastLiveItems: new Array(99_999) },
          [FeedConditionTypeKeyEnum.SpamPermitted],
          t
        )
      ).toBe(false);
    });

    it('uses default threshold for channel-level podcastRemoteItems', () => {
      expect(
        checkIfSpamFeed(
          { items: [], podcastLiveItems: [], podcastRemoteItems: new Array(10_000) },
          [],
          t
        )
      ).toBe(true);
      expect(
        checkIfSpamFeed(
          { items: [], podcastLiveItems: [], podcastRemoteItems: new Array(9_999) },
          [],
          t
        )
      ).toBe(false);
    });

    it('uses spam-permitted threshold for podcastRemoteItems when permitted', () => {
      expect(
        checkIfSpamFeed(
          { items: [], podcastLiveItems: [], podcastRemoteItems: new Array(100_000) },
          [FeedConditionTypeKeyEnum.SpamPermitted],
          t
        )
      ).toBe(true);
      expect(
        checkIfSpamFeed(
          { items: [], podcastLiveItems: [], podcastRemoteItems: new Array(99_999) },
          [FeedConditionTypeKeyEnum.SpamPermitted],
          t
        )
      ).toBe(false);
    });

    it('respects custom thresholds', () => {
      expect(
        checkIfSpamFeed({ items: new Array(5), podcastLiveItems: [] }, [], {
          defaultLimit: 5,
          spamPermittedLimit: 100_000,
        })
      ).toBe(true);
    });

    it('returns false for undefined or missing arrays', () => {
      expect(checkIfSpamFeed(undefined, [], t)).toBe(false);
      expect(checkIfSpamFeed({}, [], t)).toBe(false);
      expect(
        checkIfSpamFeed({ items: [], podcastLiveItems: [], podcastRemoteItems: undefined }, [], t)
      ).toBe(false);
    });
  });

  describe('resolveSpamFeedItemThresholds', () => {
    it('returns original thresholds when override is null', () => {
      const thresholds = {
        defaultLimit: 11_000,
        spamPermittedLimit: 99_000,
      };
      expect(resolveSpamFeedItemThresholds(thresholds, null)).toEqual(thresholds);
    });

    it('uses override for both thresholds when override exists', () => {
      expect(
        resolveSpamFeedItemThresholds(
          {
            defaultLimit: 10_000,
            spamPermittedLimit: 100_000,
          },
          12_345
        )
      ).toEqual({
        defaultLimit: 12_345,
        spamPermittedLimit: 12_345,
      });
    });
  });
});
