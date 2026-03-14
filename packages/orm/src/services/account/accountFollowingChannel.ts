import { AccountFollowingChannel } from '@orm/entities/account/accountFollowingChannel.js';
import { FeedFlagStatusStatusEnum } from '@orm/entities/feed/feedFlagStatus.js';
import { AccountService } from '@orm/services/account/account.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import type { EntityManager, FindManyOptions } from 'typeorm';
import { Equal, In } from 'typeorm';

import type { QueryParamsMedium } from '@podverse/helpers';
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
        feed: {
          feed_flag_status: In([
            FeedFlagStatusStatusEnum.Active,
            FeedFlagStatusStatusEnum.AlwaysParse,
          ]),
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
        feed: {
          feed_flag_status: In([
            FeedFlagStatusStatusEnum.Active,
            FeedFlagStatusStatusEnum.AlwaysParse,
          ]),
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
