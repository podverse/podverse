import { AppDataSourceRead } from '@orm/db/index.js';
import { FeedFlagStatus, FeedFlagStatusStatusEnum } from '@orm/entities/feed/feedFlagStatus.js';
import { FeedFlagStatusReason } from '@orm/entities/feed/feedFlagStatusReason.js';

export const checkIfFeedFlagStatusShouldParse = (status: FeedFlagStatusStatusEnum) => {
  if (
    status === FeedFlagStatusStatusEnum.Active ||
    status === FeedFlagStatusStatusEnum.AlwaysParse ||
    status === FeedFlagStatusStatusEnum.SpamPermitted
  ) {
    return true;
  }
  return false;
};

export type SpamFeedItemThresholds = {
  defaultLimit: number;
  spamPermittedLimit: number;
};

/** Defaults match worker env `PARSER_SPAM_FEED_ITEM_THRESHOLD_*` when unset. */
export const DEFAULT_SPAM_FEED_ITEM_THRESHOLDS: SpamFeedItemThresholds = {
  defaultLimit: 10_000,
  spamPermittedLimit: 100_000,
};

export const checkIfSpamFeed = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- partytime parsed feed shape
  parsedFeed: any,
  status: FeedFlagStatusStatusEnum,
  thresholds: SpamFeedItemThresholds
) => {
  const spamLimit =
    status === FeedFlagStatusStatusEnum.SpamPermitted
      ? thresholds.spamPermittedLimit
      : thresholds.defaultLimit;
  return (
    parsedFeed?.items?.length >= spamLimit || parsedFeed?.podcastLiveItems?.length >= spamLimit
  );
};

export class FeedFlagStatusService {
  private repositoryRead = AppDataSourceRead.getRepository(FeedFlagStatus);

  async get(id: number): Promise<FeedFlagStatus | null> {
    return await this.repositoryRead.findOne({
      where: { id },
    });
  }
}

export class FeedFlagStatusReasonService {
  private repositoryRead = AppDataSourceRead.getRepository(FeedFlagStatusReason);

  async get(id: number): Promise<FeedFlagStatusReason | null> {
    return await this.repositoryRead.findOne({
      where: { id },
    });
  }

  async list(): Promise<FeedFlagStatusReason[]> {
    return await this.repositoryRead.find({
      order: { id: 'ASC' },
    });
  }
}
