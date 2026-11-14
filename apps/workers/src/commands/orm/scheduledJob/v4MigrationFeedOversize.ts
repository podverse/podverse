import type { FeedParseFailureReason } from '@podverse/helpers';
import { PARSER_MAX_FEED_BODY_BYTES_MAX } from '@podverse/helpers';

export type MigrationOversizeDecision = 'raise' | 'give_up' | 'none';

/**
 * A migration retry raises the body limit once, up to the parser maximum. A feed already at
 * that maximum that is still oversized fails for good.
 */
export function decideMigrationOversize(input: {
  lastFailureReason: FeedParseFailureReason | null;
  oversizedConditionActive: boolean;
  currentOverride: number | null;
}): MigrationOversizeDecision {
  const oversized = input.lastFailureReason === 'body_too_large' || input.oversizedConditionActive;
  if (!oversized) {
    return 'none';
  }
  if (input.currentOverride === null || input.currentOverride < PARSER_MAX_FEED_BODY_BYTES_MAX) {
    return 'raise';
  }
  return 'give_up';
}

export type MigrationOversizeFeedCount = {
  maxResponseBodyBytesOverride: number | null;
  lastParseFailureReason: FeedParseFailureReason | null;
};

export type MigrationOversizeCounts = {
  oversizeRaised: number;
  oversizeGaveUp: number;
};

/**
 * Counts catalog feeds whose body-limit override is the parser maximum. A last failure of
 * `body_too_large` gave up. Any other last reason, including none, was raised.
 */
export function countMigrationOversizeFeeds(
  feeds: readonly MigrationOversizeFeedCount[]
): MigrationOversizeCounts {
  let oversizeRaised = 0;
  let oversizeGaveUp = 0;
  for (const feed of feeds) {
    if (feed.maxResponseBodyBytesOverride !== PARSER_MAX_FEED_BODY_BYTES_MAX) {
      continue;
    }
    if (feed.lastParseFailureReason === 'body_too_large') {
      oversizeGaveUp += 1;
    } else {
      oversizeRaised += 1;
    }
  }
  return { oversizeRaised, oversizeGaveUp };
}
