import { AccountFollowingAddByRSSChannel } from '@orm/entities/account/accountFollowingAddByRSSChannel.js';
import {
  decryptCredentials,
  encryptCredentials,
  isEncryptionConfigured,
} from '@orm/lib/credentialsEncryption.js';
import { AccountService } from '@orm/services/account/account.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import type { EntityManager, FindManyOptions, FindOptionsSelect } from 'typeorm';

export type AccountFollowingAddByRSSChannelDto = {
  feed_url: string;
  title?: string | null;
  image_url?: string | null;
  basic_auth_username?: string | null;
  basic_auth_password?: string | null;
};

export type AddByRSSFeedCredentials = {
  username: string;
  password: string;
};

export type MarkAddByRSSChannelSeenEntry = {
  feed_url: string;
  /** Moment to record. Omitted means the sweep's own timestamp. */
  last_seen_at?: Date;
};

export class AccountFollowingAddByRSSChannelService extends BaseManyService<
  AccountFollowingAddByRSSChannel,
  'account'
> {
  private accountService: AccountService;

  constructor(transactionalEntityManager?: EntityManager) {
    super(AccountFollowingAddByRSSChannel, 'account', transactionalEntityManager);
    this.accountService = new AccountService();
  }

  async getFollowedAddByRSSChannels(
    account_id: number,
    config?: FindManyOptions<AccountFollowingAddByRSSChannel>
  ): Promise<AccountFollowingAddByRSSChannel[]> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const safeSelect: FindOptionsSelect<AccountFollowingAddByRSSChannel> = {
      account_id: true,
      feed_url: true,
      title: true,
      image_url: true,
      basic_auth_username: true,
      last_seen_at: true,
    };
    const mergedConfig: FindManyOptions<AccountFollowingAddByRSSChannel> = {
      select: safeSelect,
      ...config,
    };
    const rows = await this._getAll(account, mergedConfig);
    return rows.map((row) => {
      if (row.basic_auth_username?.startsWith('v1:')) {
        return { ...row, basic_auth_username: '[saved]' as string | null };
      }
      return row;
    });
  }

  async getFollowedAddByRSSChannelCount(account_id: number): Promise<number> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    return this.repositoryRead.count({
      where: {
        account_id: account.id,
      },
    });
  }

  async hasFollowedAddByRSSChannel(account_id: number, feed_url: string): Promise<boolean> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const existing = await this._get(account, { feed_url });
    return !!existing;
  }

  async getCredentialsForFeed(
    account_id: number,
    feed_url: string
  ): Promise<AddByRSSFeedCredentials | null> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      return null;
    }
    const row = await this._get(account, { feed_url });
    if (!row?.basic_auth_username || !row?.basic_auth_password) {
      return null;
    }
    const username = decryptCredentials(row.basic_auth_username);
    const password = decryptCredentials(row.basic_auth_password);
    if (username === null || password === null) {
      return null;
    }
    return { username, password };
  }

  async addOrUpdateRSSChannel(
    account_id: number,
    dto: AccountFollowingAddByRSSChannelDto
  ): Promise<AccountFollowingAddByRSSChannel> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    let payload = dto;
    if (
      isEncryptionConfigured() &&
      dto.basic_auth_username !== undefined &&
      dto.basic_auth_username !== null &&
      dto.basic_auth_username !== '' &&
      dto.basic_auth_password !== undefined &&
      dto.basic_auth_password !== null &&
      dto.basic_auth_password !== ''
    ) {
      payload = {
        ...dto,
        basic_auth_username: encryptCredentials(dto.basic_auth_username),
        basic_auth_password: encryptCredentials(dto.basic_auth_password),
      };
    }

    return this._update(account, ['account_id', 'feed_url'], payload);
  }

  async removeRSSChannel(account_id: number, feed_url: string): Promise<void> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    return this._delete(account, { feed_url });
  }

  /**
   * When each followed feed was last opened, a page at a time.
   *
   * No unseen count comes back with it. The server stores no add-by-RSS items, so the number of
   * unseen ones is a question only the device holding the feed can answer; this endpoint carries the
   * timestamp that lets it answer consistently across devices.
   */
  async listSeenState(
    account_id: number,
    { limit, offset }: { limit: number; offset: number }
  ): Promise<{ count: number; results: { feed_url: string; last_seen_at: Date | null }[] }> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const [rows, count] = await this.repositoryRead.findAndCount({
      order: { feed_url: 'ASC' },
      select: { feed_url: true, last_seen_at: true },
      skip: offset,
      take: limit,
      where: { account_id: account.id },
    });

    return {
      count,
      results: rows.map((row) => ({ feed_url: row.feed_url, last_seen_at: row.last_seen_at })),
    };
  }

  /**
   * Record that the account has seen these feeds.
   *
   * The server holds no add-by-RSS items, so it cannot say how many are unseen — the device derives
   * that from the feed it stores. Keeping the timestamp here is what makes opening a feed on the
   * phone clear its badge on the desktop.
   *
   * `GREATEST` ignores NULL, so a first mark takes the supplied value and a replayed older one is a
   * no-op. Feeds the account no longer follows are skipped rather than failing the batch.
   */
  async markAddByRSSChannelsSeen(
    account_id: number,
    entries: readonly MarkAddByRSSChannelSeenEntry[],
    defaultSeenAt: Date
  ): Promise<{ feed_url: string; last_seen_at: Date | null }[]> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const seenAtByFeedUrl = new Map<string, Date>();
    for (const entry of entries) {
      const candidate = entry.last_seen_at ?? defaultSeenAt;
      const existing = seenAtByFeedUrl.get(entry.feed_url);
      if (existing === undefined || candidate.getTime() > existing.getTime()) {
        seenAtByFeedUrl.set(entry.feed_url, candidate);
      }
    }

    if (seenAtByFeedUrl.size === 0) {
      return [];
    }

    const updates = [...seenAtByFeedUrl.entries()];
    const values = updates
      .map((_entry, index) => `($${index * 2 + 2}::text, $${index * 2 + 3}::timestamptz)`)
      .join(', ');
    const parameters: (number | string | Date)[] = [account.id];
    for (const [feedUrl, seenAt] of updates) {
      parameters.push(feedUrl, seenAt);
    }

    return this.repositoryReadWrite.query(
      `UPDATE account_following_add_by_rss_channel AS follow
       SET last_seen_at = GREATEST(follow.last_seen_at, incoming.last_seen_at)
       FROM (VALUES ${values}) AS incoming(feed_url, last_seen_at)
       WHERE follow.account_id = $1
         AND follow.feed_url::text = incoming.feed_url
       RETURNING follow.feed_url AS feed_url, follow.last_seen_at AS last_seen_at`,
      parameters
    );
  }

  /** Mark every followed feed seen in one statement, and report how many rows moved. */
  async markAllAddByRSSChannelsSeen(account_id: number, seenAt: Date): Promise<number> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const result = await this.repositoryReadWrite
      .createQueryBuilder()
      .update(AccountFollowingAddByRSSChannel)
      .set({ last_seen_at: () => 'GREATEST(last_seen_at, :seenAt)' })
      .where('account_id = :account_id', { account_id: account.id })
      .setParameter('seenAt', seenAt)
      .execute();

    return result.affected ?? 0;
  }
}
