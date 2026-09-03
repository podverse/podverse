import { AccountFollowingChannel } from '@orm/entities/account/accountFollowingChannel.js';
import { ItemFlagStatusStatusEnum } from '@orm/entities/item/itemFlagStatus.js';
import { AccountService } from '@orm/services/account/account.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import type { EntityManager, FindManyOptions, FindOptionsWhere } from 'typeorm';
import { Equal, In, IsNull, Not } from 'typeorm';

import type { BulkFollowChannelResult, QueryParamsMedium } from '@podverse/helpers';
import { CHANNEL_UNSEEN_COUNT_CAP, getMediumIdArrayFromType } from '@podverse/helpers';

import { ChannelService } from '../channel/channel.js';

/**
 * One row of per-channel seen state, straight from SQL.
 *
 * `raw_unseen_count` stops one past the display cap so the caller can tell exactly-the-cap from
 * more-than-the-cap; it is not the true number of unseen items beyond that point.
 */
export type ChannelSeenRow = {
  channel_id_text: string;
  last_seen_at: Date | null;
  raw_unseen_count: number;
};

export type MarkChannelSeenEntry = {
  channel_id_text: string;
  /** Moment to record. Omitted means the sweep's own timestamp. */
  last_seen_at?: Date;
};

export class AccountFollowingChannelService extends BaseManyService<
  AccountFollowingChannel,
  'account'
> {
  private accountService: AccountService;
  private channelService: ChannelService;

  constructor(transactionalEntityManager?: EntityManager) {
    super(AccountFollowingChannel, 'account', transactionalEntityManager);
    this.accountService = new AccountService();
    this.channelService = new ChannelService();
  }

  async getFollowedChannels(
    account_id: number,
    mediumType: QueryParamsMedium | null,
    config?: FindManyOptions<AccountFollowingChannel>
  ): Promise<AccountFollowingChannel[]> {
    const medium_ids = mediumType ? getMediumIdArrayFromType(mediumType) : null;

    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const finalConfig = {
      ...config,
      ...(medium_ids
        ? {
            where: {
              ...config?.where,
              channel: {
                medium_id: In(medium_ids),
              },
            },
          }
        : {}),
    };

    return this._getAll(account, finalConfig);
  }

  async getFollowedChannelsWithCount(
    account_id: number,
    mediumType: QueryParamsMedium | null,
    config?: FindManyOptions<AccountFollowingChannel>
  ): Promise<{
    count: number;
    results: AccountFollowingChannel[];
  }> {
    const medium_ids = mediumType ? getMediumIdArrayFromType(mediumType) : null;

    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const where: FindManyOptions<AccountFollowingChannel>['where'] = {
      account_id: Equal(account.id),
      channel: {
        channel_about: {
          id: Not(IsNull()),
        },
        feed: {
          feed_policy: {
            public_visible: true,
          },
        },
        ...(medium_ids ? { medium_id: In(medium_ids) } : {}),
      },
    };

    const finalConfig = {
      ...config,
      where,
    };

    return this._getAllWithCount(account, finalConfig);
  }

  async hasFollowedChannel(account_id: number, channel_id_text: string): Promise<boolean> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const channel = await this.channelService.getByIdText(channel_id_text);
    if (!channel) {
      throw new Error('Channel not found.');
    }

    const existing = await this._get(account, { channel_id: channel.id });
    return !!existing;
  }

  async followChannel(
    account_id: number,
    channel_id_text: string
  ): Promise<AccountFollowingChannel> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const channel = await this.channelService.getByIdText(channel_id_text);
    if (!channel) {
      throw new Error('Channel not found.');
    }

    const dto = { channel_id: channel.id };

    return this._update(account, ['account_id', 'channel_id'], dto);
  }

  /**
   * Follow many channels in one pass, reporting an outcome per requested `id_text`.
   *
   * Deliberately batched rather than looping `followChannel`: that would run three queries per
   * channel, and mobile's sign-up merge can send hundreds at once. Resolving the channels and the
   * existing follows up front makes it a fixed number of round trips.
   *
   * Idempotent — channels already followed report `already_following` and are not rewritten, so
   * resubmitting the same list is a no-op. Unknown `id_text`s report `not_found` instead of failing
   * the batch, so one stale local subscription cannot block the rest of a merge.
   */
  async followChannelsBulk(
    account_id: number,
    channel_id_texts: string[]
  ): Promise<BulkFollowChannelResult[]> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    // Preserve request order in the response, but only look up each channel once.
    const uniqueIdTexts = [...new Set(channel_id_texts)];
    if (uniqueIdTexts.length === 0) {
      return [];
    }

    const channels = await this.channelService.getManyByIdTexts(uniqueIdTexts);
    const channelIdByIdText = new Map(channels.map((channel) => [channel.id_text, channel.id]));

    const existingRows = await this.repositoryRead.find({
      where: {
        account_id: Equal(account.id),
        channel_id: In([...channelIdByIdText.values()]),
      } as FindOptionsWhere<AccountFollowingChannel>,
    });
    const alreadyFollowedChannelIds = new Set(existingRows.map((row) => row.channel_id));

    const rowsToInsert: { account_id: number; channel_id: number }[] = [];
    const results: BulkFollowChannelResult[] = [];

    for (const channelIdText of uniqueIdTexts) {
      const channelId = channelIdByIdText.get(channelIdText);
      if (channelId === undefined) {
        results.push({ channel_id_text: channelIdText, outcome: 'not_found' });
        continue;
      }

      if (alreadyFollowedChannelIds.has(channelId)) {
        results.push({ channel_id_text: channelIdText, outcome: 'already_following' });
        continue;
      }

      rowsToInsert.push({ account_id: account.id, channel_id: channelId });
      results.push({ channel_id_text: channelIdText, outcome: 'followed' });
    }

    if (rowsToInsert.length > 0) {
      // `orIgnore` guards the composite primary key against a concurrent follow of the same channel
      // between the read above and this write — that racer's row stands and this one is dropped.
      await this.repositoryReadWrite
        .createQueryBuilder()
        .insert()
        .into(AccountFollowingChannel)
        .values(rowsToInsert)
        .orIgnore()
        .execute();
    }

    return results;
  }

  async unfollowChannel(account_id: number, channel_id_text: string): Promise<void> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const channel = await this.channelService.getByIdText(channel_id_text);
    if (!channel) {
      throw new Error('Channel not found.');
    }

    return this._delete(account, { channel_id: channel.id });
  }

  async getFollowedChannelsByAccountIdTextWithCount(
    account_id_text: string,
    mediumType: QueryParamsMedium | null = null,
    config?: FindManyOptions<AccountFollowingChannel>
  ): Promise<{ count: number; results: AccountFollowingChannel[] }> {
    const medium_ids = mediumType ? getMediumIdArrayFromType(mediumType) : null;

    const account = await this.accountService.getByIdText(account_id_text);
    if (!account) {
      throw new Error('Account not found.');
    }

    const where: FindManyOptions<AccountFollowingChannel>['where'] = {
      account_id: Equal(account.id),
      channel: {
        channel_about: {
          id: Not(IsNull()),
        },
        feed: {
          feed_policy: {
            public_visible: true,
          },
        },
        ...(medium_ids ? { medium_id: In(medium_ids) } : {}),
      },
    };

    const finalConfig = {
      ...config,
      where,
    };

    return this._getAllWithCount(account, finalConfig);
  }

  /**
   * Read a page of the account's follows with each channel's unseen item count.
   *
   * Raw SQL because the shape has no TypeORM equivalent: the count compares each item against *that
   * row's* `last_seen_at`, so it is a correlated per-row aggregate rather than one predicate over
   * the whole set.
   *
   * Every dimension is bounded. The page limit bounds the channels, and the `LIMIT` inside the
   * lateral bounds the items per channel to one past the display cap — so the worst case is a fixed
   * number of index lookups regardless of how many episodes the shows have or how long the account
   * has been away. Fetching one extra row is what separates "exactly 20 unseen" from "more than 20".
   *
   * Counts only what the channel's episode list shows: active items, excluding live items, which is
   * the same filter `ItemService.getManyByChannel` applies. A badge promising episodes that the list
   * then hides is worse than no badge.
   */
  async listSeenStateWithCount(
    account_id: number,
    { limit, offset }: { limit: number; offset: number }
  ): Promise<{ count: number; results: ChannelSeenRow[] }> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const countRows: { total: string }[] = await this.repositoryRead.query(
      `SELECT COUNT(*)::text AS total
       FROM account_following_channel AS follow
       WHERE follow.account_id = $1`,
      [account.id]
    );
    const count = Number(countRows[0]?.total ?? 0);

    const rows: { channel_id_text: string; last_seen_at: Date | null; raw_unseen_count: number }[] =
      await this.repositoryRead.query(
        `SELECT
           channel.id_text AS channel_id_text,
           follow.last_seen_at AS last_seen_at,
           unseen.raw_unseen_count AS raw_unseen_count
         FROM account_following_channel AS follow
         INNER JOIN channel ON channel.id = follow.channel_id
         CROSS JOIN LATERAL (
           SELECT COUNT(*)::int AS raw_unseen_count
           FROM (
             SELECT 1
             FROM item
             LEFT JOIN live_item ON live_item.item_id = item.id
             WHERE item.channel_id = follow.channel_id
               AND item.item_flag_status_id = $2
               AND live_item.id IS NULL
               AND follow.last_seen_at IS NOT NULL
               AND item.pub_date > follow.last_seen_at
             LIMIT $3
           ) AS capped
         ) AS unseen
         WHERE follow.account_id = $1
         ORDER BY channel.id_text ASC
         LIMIT $4 OFFSET $5`,
        [
          account.id,
          ItemFlagStatusStatusEnum.Active,
          CHANNEL_UNSEEN_COUNT_CAP + 1,
          limit,
          Math.max(offset, 0),
        ]
      );

    return {
      count,
      results: rows.map((row) => ({
        channel_id_text: row.channel_id_text,
        last_seen_at: row.last_seen_at,
        raw_unseen_count: Number(row.raw_unseen_count),
      })),
    };
  }

  /**
   * Record that the account has seen these channels, and return their refreshed state.
   *
   * `GREATEST` is what enforces monotonicity in the database rather than in a read-modify-write:
   * two devices reporting different moments at once cannot leave the earlier one stored, and it
   * ignores NULL, so a first mark simply takes the supplied value. A device replaying an old
   * timestamp is therefore a no-op instead of a regression, which is what lets the merge run on
   * every sync.
   *
   * Channels the account does not follow are silently skipped — seen state has no meaning without a
   * follow, and one stale entry must not fail a merge.
   */
  async markChannelsSeen(
    account_id: number,
    entries: readonly MarkChannelSeenEntry[],
    defaultSeenAt: Date
  ): Promise<ChannelSeenRow[]> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    // Later duplicates win, matching what the database would settle on anyway.
    const seenAtByIdText = new Map<string, Date>();
    for (const entry of entries) {
      const candidate = entry.last_seen_at ?? defaultSeenAt;
      const existing = seenAtByIdText.get(entry.channel_id_text);
      if (existing === undefined || candidate.getTime() > existing.getTime()) {
        seenAtByIdText.set(entry.channel_id_text, candidate);
      }
    }

    if (seenAtByIdText.size === 0) {
      return [];
    }

    const idTexts = [...seenAtByIdText.keys()];
    const channels = await this.channelService.getManyByIdTexts(idTexts);
    if (channels.length === 0) {
      return [];
    }

    const updates = channels
      .map((channel) => {
        const seenAt = seenAtByIdText.get(channel.id_text);
        return seenAt === undefined ? null : { channelId: channel.id, seenAt };
      })
      .filter((update): update is { channelId: number; seenAt: Date } => update !== null);

    if (updates.length === 0) {
      return [];
    }

    // One statement for the batch: a merge can carry hundreds of channels, and a round trip each
    // would make sign-in the slowest thing the app does.
    const values = updates
      .map((_update, index) => `($${index * 2 + 2}::integer, $${index * 2 + 3}::timestamptz)`)
      .join(', ');
    const parameters: (number | Date)[] = [account.id];
    for (const update of updates) {
      parameters.push(update.channelId, update.seenAt);
    }

    const rows: { channel_id_text: string; last_seen_at: Date | null }[] =
      await this.repositoryReadWrite.query(
        `UPDATE account_following_channel AS follow
         SET last_seen_at = GREATEST(follow.last_seen_at, incoming.last_seen_at)
         FROM (VALUES ${values}) AS incoming(channel_id, last_seen_at)
         WHERE follow.account_id = $1
           AND follow.channel_id = incoming.channel_id
         RETURNING
           (SELECT channel.id_text FROM channel WHERE channel.id = follow.channel_id)
             AS channel_id_text,
           follow.last_seen_at AS last_seen_at`,
        parameters
      );

    // A just-marked channel has nothing unseen by construction, so there is no count to re-derive.
    return rows.map((row) => ({
      channel_id_text: row.channel_id_text,
      last_seen_at: row.last_seen_at,
      raw_unseen_count: 0,
    }));
  }

  /**
   * Mark every followed channel seen, and report how many rows moved.
   *
   * Done in one statement rather than by sending every channel id, so "Mark All As Seen" costs the
   * same whether the account follows five shows or five hundred.
   */
  async markAllChannelsSeen(account_id: number, seenAt: Date): Promise<number> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const result = await this.repositoryReadWrite
      .createQueryBuilder()
      .update(AccountFollowingChannel)
      .set({ last_seen_at: () => 'GREATEST(last_seen_at, :seenAt)' })
      .where('account_id = :account_id', { account_id: account.id })
      .setParameter('seenAt', seenAt)
      .execute();

    return result.affected ?? 0;
  }
}
