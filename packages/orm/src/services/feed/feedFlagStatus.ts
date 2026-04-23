import { AppDataSourceRead } from '@orm/db/index.js';
import { FeedFlagStatus, FeedFlagStatusStatusEnum } from '@orm/entities/feed/feedFlagStatus.js';
import { FeedFlagStatusReason } from '@orm/entities/feed/feedFlagStatusReason.js';

export const checkIfFeedFlagStatusShouldParse = (status: FeedFlagStatusStatusEnum) => {
  if (
    status === FeedFlagStatusStatusEnum.Active ||
    status === FeedFlagStatusStatusEnum.AlwaysParse
  ) {
    return true;
  }
  return false;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const checkIfSpamFeed = (parsedFeed: any) => {
  const spamLimit = 10000;
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
