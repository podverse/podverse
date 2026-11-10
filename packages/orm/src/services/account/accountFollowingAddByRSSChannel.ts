import { AccountFollowingAddByRSSChannel } from '@orm/entities/account/accountFollowingAddByRSSChannel.js';
import { AccountService } from '@orm/services/account/account.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import type { EntityManager, FindManyOptions, FindOptionsSelect, FindOptionsWhere } from 'typeorm';
import { Equal, In } from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

/** http(s) with no `user:pass@`: the follow row is read by every device on the account. */
const isStorableImageUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.username === '' &&
      url.password === ''
    );
  } catch {
    return false;
  }
};

export type AccountFollowingAddByRSSChannelDto = {
  feed_url: string;
  title?: string | null;
  image_url?: string | null;
  /** Omitted on update leaves the stored flag unchanged. */
  requires_credentials?: boolean;
};

export type MarkAddByRSSChannelSeenEntry = {
  feed_url: string;
  /** Moment to record. Omitted means the sweep's own timestamp. */
  last_seen_at?: Date;
};

/** Mark result: the new timestamp and the value that was stored before this write. */
export type AddByRssSeenMarkRow = {
  feed_url: string;
  last_seen_at: Date | null;
  previous_last_seen_at: Date | null;
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
      requires_credentials: true,
      last_seen_at: true,
    };
    const mergedConfig: FindManyOptions<AccountFollowingAddByRSSChannel> = {
      select: safeSelect,
      ...config,
    };
    return this._getAll(account, mergedConfig);
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

  async addOrUpdateRSSChannel(
    account_id: number,
    dto: AccountFollowingAddByRSSChannelDto
  ): Promise<AccountFollowingAddByRSSChannel> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    return this._update(account, ['account_id', 'feed_url'], dto);
  }

  /**
   * Records what a parse learned about whether the feed needs credentials. A no-op when the
   * account does not follow the feed (a one-off parse before saving it).
   */
  async setRequiresCredentials(
    account_id: number,
    feed_url: string,
    requires_credentials: boolean
  ): Promise<void> {
    await this.repositoryReadWrite.update({ account_id, feed_url }, { requires_credentials });
  }

  /**
   * Records the title and artwork a parse found, so devices that have not parsed the feed show
   * them. Missing or empty values leave the stored ones alone. An image URL that carries
   * credentials, is not http(s), or does not fit the column is dropped. A no-op when the account
   * does not follow the feed.
   */
  async setFeedMetadata(
    account_id: number,
    feed_url: string,
    metadata: { title?: string | null; image_url?: string | null }
  ): Promise<void> {
    const update: { title?: string; image_url?: string } = {};

    const title = metadata.title?.trim() ?? '';
    if (title !== '') {
      update.title = title.slice(0, DATABASE_CONSTANTS.varchar_normal);
    }

    const imageUrl = metadata.image_url?.trim() ?? '';
    if (
      imageUrl !== '' &&
      imageUrl.length <= DATABASE_CONSTANTS.varchar_url &&
      isStorableImageUrl(imageUrl)
    ) {
      update.image_url = imageUrl;
    }

    if (update.title === undefined && update.image_url === undefined) {
      return;
    }

    await this.repositoryReadWrite.update({ account_id, feed_url }, update);
  }

  async removeRSSChannel(account_id: number, feed_url: string): Promise<void> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    return this._delete(account, { feed_url });
  }

  /** Ends this account's follow of each Add by RSS feed URL. URLs it does not follow are skipped. */
  async removeRSSChannelsBulk(account_id: number, feed_urls: string[]): Promise<void> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const unique = [...new Set(feed_urls)];
    if (unique.length === 0) {
      return;
    }

    await this.repositoryReadWrite.delete({
      account_id: Equal(account.id),
      feed_url: In(unique),
    } as FindOptionsWhere<AccountFollowingAddByRSSChannel>);
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
  ): Promise<AddByRssSeenMarkRow[]> {
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
    const feedUrls = updates.map(([feedUrl]) => feedUrl);
    const previousRows: { feed_url: string; last_seen_at: Date | null }[] =
      await this.repositoryReadWrite.query(
        `SELECT follow.feed_url AS feed_url, follow.last_seen_at AS last_seen_at
         FROM account_following_add_by_rss_channel AS follow
         WHERE follow.account_id = $1
           AND follow.feed_url::text = ANY($2::text[])`,
        [account.id, feedUrls]
      );
    const previousByFeedUrl = new Map(
      previousRows.map((row) => [row.feed_url, row.last_seen_at] as const)
    );

    const values = updates
      .map((_entry, index) => `($${index * 2 + 2}::text, $${index * 2 + 3}::timestamptz)`)
      .join(', ');
    const parameters: (number | string | Date)[] = [account.id];
    for (const [feedUrl, seenAt] of updates) {
      parameters.push(feedUrl, seenAt);
    }

    const rows: { feed_url: string; last_seen_at: Date | null }[] =
      await this.repositoryReadWrite.query(
        `UPDATE account_following_add_by_rss_channel AS follow
         SET last_seen_at = GREATEST(follow.last_seen_at, incoming.last_seen_at)
         FROM (VALUES ${values}) AS incoming(feed_url, last_seen_at)
         WHERE follow.account_id = $1
           AND follow.feed_url::text = incoming.feed_url
         RETURNING follow.feed_url AS feed_url, follow.last_seen_at AS last_seen_at`,
        parameters
      );

    return rows.map((row) => ({
      feed_url: row.feed_url,
      last_seen_at: row.last_seen_at,
      previous_last_seen_at: previousByFeedUrl.get(row.feed_url) ?? null,
    }));
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
