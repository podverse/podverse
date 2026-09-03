import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db/index.js';
import type { Account } from '@orm/entities/account/account.js';
import { OnDemandParserEvent } from '@orm/entities/onDemandParserEvent.js';
import type { Repository } from 'typeorm';
import { LessThan, MoreThan } from 'typeorm';

import type { OnDemandParserEventType } from '@podverse/helpers';
import { subtractDays } from '@podverse/helpers';

type CreateOnDemandParserEventDto = {
  account: Account;
  podcastIndexId: number;
  remoteParentPodcastIndexId: number | null;
  type: OnDemandParserEventType;
};

export class OnDemandParserEventService {
  protected repositoryRead: Repository<OnDemandParserEvent>;
  protected repositoryReadWrite: Repository<OnDemandParserEvent>;

  constructor() {
    this.repositoryRead = AppDataSourceRead.getRepository(OnDemandParserEvent);
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(OnDemandParserEvent);
  }

  async create(dto: CreateOnDemandParserEventDto): Promise<OnDemandParserEvent> {
    const newEvent = this.repositoryReadWrite.create({
      account: dto.account,
      podcastIndexId: dto.podcastIndexId,
      ...(dto.remoteParentPodcastIndexId !== null && {
        remoteParentPodcastIndexId: dto.remoteParentPodcastIndexId,
      }),
      type: dto.type,
    });

    return this.repositoryReadWrite.save(newEvent);
  }

  async getAggregateCount(type: OnDemandParserEventType): Promise<{ [accountId: number]: number }> {
    const results = await this.repositoryRead
      .createQueryBuilder('event')
      .select('event.account_id', 'accountId')
      .addSelect('COUNT(event.id)', 'count')
      .where('event.type = :type', { type })
      .groupBy('event.account_id')
      .orderBy('count', 'DESC')
      .getRawMany();

    const aggregateCounts: { [accountId: number]: number } = {};
    for (const result of results) {
      aggregateCounts[result.accountId] = parseInt(result.count, 10);
    }

    return aggregateCounts;
  }

  async deleteOutdatedEvents(days: number): Promise<void> {
    await this.repositoryReadWrite.delete({
      createdAt: LessThan(subtractDays(new Date(), days)),
    });
  }

  async getCountByAccountIdAndTypeSince(
    accountId: number,
    type: OnDemandParserEventType,
    since: Date
  ): Promise<number> {
    return this.repositoryRead.count({
      where: {
        account: { id: accountId },
        type,
        createdAt: MoreThan(since),
      },
    });
  }
}
