import { FeedConditionTypeKeyEnum } from '@orm/entities/feed/feedConditionType.js';

export type SpamFeedItemThresholds = {
  defaultLimit: number;
  spamPermittedLimit: number;
};

/** Defaults match worker env `PARSER_SPAM_FEED_ITEM_THRESHOLD_*` when unset. */
export const DEFAULT_SPAM_FEED_ITEM_THRESHOLDS: SpamFeedItemThresholds = {
  defaultLimit: 10_000,
  spamPermittedLimit: 100_000,
};

export const resolveSpamFeedItemThresholds = (
  thresholds: SpamFeedItemThresholds,
  spamItemLimitOverride: number | null
): SpamFeedItemThresholds => {
  if (spamItemLimitOverride === null) {
    return thresholds;
  }

  return {
    defaultLimit: spamItemLimitOverride,
    spamPermittedLimit: spamItemLimitOverride,
  };
};

/**
 * Chooses the spam item limit from whether **`spam_permitted`** is among active condition keys.
 */
export const checkIfSpamFeed = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- partytime parsed feed shape
  parsedFeed: any,
  activeConditionKeys: FeedConditionTypeKeyEnum[],
  thresholds: SpamFeedItemThresholds
): boolean => {
  const useSpamPermittedLimit = activeConditionKeys.includes(
    FeedConditionTypeKeyEnum.SpamPermitted
  );
  const spamLimit = useSpamPermittedLimit ? thresholds.spamPermittedLimit : thresholds.defaultLimit;
  return (
    parsedFeed?.items?.length >= spamLimit ||
    parsedFeed?.podcastLiveItems?.length >= spamLimit ||
    parsedFeed?.podcastRemoteItems?.length >= spamLimit
  );
};
