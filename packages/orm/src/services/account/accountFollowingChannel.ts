import { AccountFollowingChannel } from '@orm/entities/account/accountFollowingChannel.js';
import { AccountService } from '@orm/services/account/account.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import type { EntityManager, FindManyOptions, FindOptionsWhere } from 'typeorm';
import { Equal, In, IsNull, Not } from 'typeorm';

import type { BulkFollowChannelResult, QueryParamsMedium } from '@podverse/helpers';
import { getMediumIdArrayFromType } from '@podverse/helpers';

import { ChannelService } from '../channel/channel.js';

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
}
