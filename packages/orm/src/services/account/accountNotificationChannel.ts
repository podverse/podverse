import { AppDataSourceReadWrite } from '@orm/db/index.js';
import { AccountNotificationChannel } from '@orm/entities/account/accountNotificationChannel.js';
import { AccountNotificationChannelType } from '@orm/entities/account/accountNotificationChannelType.js';
import { AccountFollowingChannelService } from '@orm/services/account/accountFollowingChannel.js';
import { AccountService } from '@orm/services/account/account.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import { ChannelService } from '@orm/services/channel/channel.js';
import type { EntityManager, FindManyOptions, FindOneOptions } from 'typeorm';

export class AccountNotificationChannelService extends BaseManyService<
  AccountNotificationChannel,
  'account'
> {
  private accountService: AccountService;
  private channelService: ChannelService;

  constructor(transactionalEntityManager?: EntityManager) {
    super(AccountNotificationChannel, 'account', transactionalEntityManager);
    this.accountService = new AccountService();
    this.channelService = new ChannelService();
  }

  async getByAccountIdAndChannelIdText(
    account_id: number,
    channel_id_text: string,
    config?: FindOneOptions<AccountNotificationChannel>
  ): Promise<AccountNotificationChannel | null> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const channel = await this.channelService.getByIdText(channel_id_text);
    if (!channel) {
      throw new Error('Channel not found.');
    }

    return this._get(account, { channel_id: channel.id }, config);
  }

  async getAllByAccountId(
    account_id: number,
    config?: FindManyOptions<AccountNotificationChannel>
  ): Promise<AccountNotificationChannel[]> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    return this._getAll(account, config);
  }

  async getAllByChannelIdText(
    channel_id_text: string,
    config?: FindManyOptions<AccountNotificationChannel>
  ): Promise<AccountNotificationChannel[]> {
    const channel = await this.channelService.getByIdText(channel_id_text);
    if (!channel) {
      throw new Error('Channel not found.');
    }

    return this.repositoryRead.find({ where: { channel_id: channel.id }, ...config });
  }

  async create(account_id: number, channel_id_text: string): Promise<AccountNotificationChannel> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const channel = await this.channelService.getByIdText(channel_id_text);
    if (!channel) {
      throw new Error('Channel not found.');
    }

    const dto = { account_id, channel_id: channel.id };
    const accountNotificationChannel = await this._update(
      account,
      ['account_id', 'channel_id'],
      dto
    );

    const notificationTypes =
      account.account_settings?.account_settings_notification?.account_settings_notification_types;

    if (notificationTypes && notificationTypes.length > 0) {
      const channelTypeRepo = AppDataSourceReadWrite.getRepository(AccountNotificationChannelType);
      const channelTypes = notificationTypes.map((settingsType) => {
        const channelType = new AccountNotificationChannelType();
        channelType.account_notification_channel = accountNotificationChannel;
        channelType.type = settingsType.type;
        return channelType;
      });
      await channelTypeRepo.save(channelTypes);
    } else {
      console.warn(
        `AccountNotificationChannelService.create: No notification types found for account ${account_id}. ` +
          'AccountNotificationChannelTypes will not be created automatically.'
      );
    }

    return accountNotificationChannel;
  }

  async delete(account_id: number, channel_id_text: string): Promise<void> {
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

  /**
   * Enable notifications for every channel the account follows that does not already have a row.
   * New rows copy the account's notification type defaults (same as create).
   */
  async enableForAllFollowedChannels(account_id: number): Promise<{ created: number }> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const followingService = new AccountFollowingChannelService();
    const followed = await followingService.getFollowedChannels(account_id, null, {
      relations: { channel: true },
      take: 10000,
    });
    const existing = await this.getAllByAccountId(account_id);
    const existingChannelIds = new Set(existing.map((row) => row.channel_id));

    let created = 0;
    for (const follow of followed) {
      const channel = follow.channel;
      if (!channel || existingChannelIds.has(channel.id)) {
        continue;
      }
      await this.create(account_id, channel.id_text);
      created += 1;
    }

    return { created };
  }

  /** Remove every per-channel notification row for the account. */
  async disableAll(account_id: number): Promise<{ deleted: number }> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const existing = await this.getAllByAccountId(account_id);
    if (existing.length === 0) {
      return { deleted: 0 };
    }

    await this.repositoryWrite.delete({ account_id });
    return { deleted: existing.length };
  }
}
