import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db/index.js';
import { AccountPendingFollowingChannel } from '@orm/entities/account/accountPendingFollowingChannel.js';
import { AccountService } from '@orm/services/account/account.js';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { In } from 'typeorm';

import { canonicalHttpOrHttpsUrl } from '@podverse/helpers-validation';

type AddPendingFollowInput = {
  podcast_index_id?: number | null;
  feed_url: string;
};

type PendingFollowLookupInput = {
  podcast_index_id?: number | null;
  feed_url?: string | null;
};

type RemovePendingFollowByKeysInput = {
  account_id: number;
  feed_url: string;
};

export class AccountPendingFollowingChannelService {
  protected repositoryRead: Repository<AccountPendingFollowingChannel>;
  protected repositoryReadWrite: Repository<AccountPendingFollowingChannel>;
  private accountService: AccountService;

  constructor() {
    this.repositoryRead = AppDataSourceRead.getRepository(AccountPendingFollowingChannel);
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(AccountPendingFollowingChannel);
    this.accountService = new AccountService();
  }

  async addPendingFollow(
    account_id: number,
    input: AddPendingFollowInput
  ): Promise<AccountPendingFollowingChannel> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const canonicalFeedUrl = canonicalHttpOrHttpsUrl(input.feed_url) ?? input.feed_url;
    const existing = await this.repositoryRead.findOne({
      where: {
        account_id: account.id,
        feed_url: canonicalFeedUrl,
      },
    });

    if (existing) {
      if (existing.podcast_index_id === null && input.podcast_index_id !== undefined) {
        existing.podcast_index_id = input.podcast_index_id;
        return this.repositoryReadWrite.save(existing);
      }
      return existing;
    }

    const pendingFollow = this.repositoryReadWrite.create({
      account_id: account.id,
      podcast_index_id: input.podcast_index_id ?? null,
      feed_url: canonicalFeedUrl,
    });

    return this.repositoryReadWrite.save(pendingFollow);
  }

  async getPendingFollowsForChannel(
    input: PendingFollowLookupInput
  ): Promise<AccountPendingFollowingChannel[]> {
    const whereClauses: FindOptionsWhere<AccountPendingFollowingChannel>[] = [];

    if (input.podcast_index_id !== null && input.podcast_index_id !== undefined) {
      whereClauses.push({ podcast_index_id: input.podcast_index_id });
    }

    if (input.feed_url !== null && input.feed_url !== undefined) {
      const canonicalFeedUrl = canonicalHttpOrHttpsUrl(input.feed_url) ?? input.feed_url;
      whereClauses.push({ feed_url: canonicalFeedUrl });
    }

    if (whereClauses.length === 0) {
      return [];
    }

    const rows = await this.repositoryRead.find({ where: whereClauses });
    if (rows.length <= 1) {
      return rows;
    }

    const dedupedIds = [...new Set(rows.map((row) => row.id))];
    if (dedupedIds.length === rows.length) {
      return rows;
    }

    return this.repositoryRead.find({
      where: {
        id: In(dedupedIds),
      },
    });
  }

  async removePendingFollow(input: number | RemovePendingFollowByKeysInput): Promise<void> {
    if (typeof input === 'number') {
      await this.repositoryReadWrite.delete({ id: input });
      return;
    }

    const canonicalFeedUrl = canonicalHttpOrHttpsUrl(input.feed_url) ?? input.feed_url;
    await this.repositoryReadWrite.delete({
      account_id: input.account_id,
      feed_url: canonicalFeedUrl,
    });
  }
}
