import { AppDataSourceReadWrite } from '@orm/db/index.js';
import { AccountNotificationChannelType } from '@orm/entities/account/accountNotificationChannelType.js';
import { AccountNotificationChannelService } from '@orm/services/account/accountNotificationChannel.js';
import type { EntityManager, FindManyOptions } from 'typeorm';

import type { AccountNotificationTypeEnum } from '@podverse/helpers';

export class AccountNotificationChannelTypeService {
  private accountNotificationChannelService: AccountNotificationChannelService;
  private transactionalEntityManager?: EntityManager;

  constructor(transactionalEntityManager?: EntityManager) {
    if (transactionalEntityManager !== undefined) {
      this.transactionalEntityManager = transactionalEntityManager;
    }
    this.accountNotificationChannelService = new AccountNotificationChannelService(
      transactionalEntityManager
    );
  }

  private get repository() {
    return this.transactionalEntityManager
      ? this.transactionalEntityManager.getRepository(AccountNotificationChannelType)
      : AppDataSourceReadWrite.getRepository(AccountNotificationChannelType);
  }

  async getAllByAccountNotificationChannelId(
    account_notification_channel_id: number,
    config?: FindManyOptions<AccountNotificationChannelType>
  ): Promise<AccountNotificationChannelType[]> {
    return this.repository.find({
      where: { account_notification_channel: { id: account_notification_channel_id } },
      ...config,
    });
  }

  async create(
    account_id: number,
    channel_id_text: string,
    type: AccountNotificationTypeEnum
  ): Promise<AccountNotificationChannelType> {
    const accountNotificationChannel =
      await this.accountNotificationChannelService.getByAccountIdAndChannelIdText(
        account_id,
        channel_id_text
      );

    if (!accountNotificationChannel) {
      throw new Error('Account notification channel not found.');
    }

    const existing = await this.repository.findOne({
      where: {
        account_notification_channel: { id: accountNotificationChannel.id },
        type,
      },
    });

    if (existing) {
      return existing;
    }

    const channelType = new AccountNotificationChannelType();
    channelType.account_notification_channel = accountNotificationChannel;
    channelType.type = type;

    return this.repository.save(channelType);
  }

  async delete(
    account_id: number,
    channel_id_text: string,
    type: AccountNotificationTypeEnum
  ): Promise<void> {
    const accountNotificationChannel =
      await this.accountNotificationChannelService.getByAccountIdAndChannelIdText(
        account_id,
        channel_id_text
      );

    if (!accountNotificationChannel) {
      throw new Error('Account notification channel not found.');
    }

    await this.repository.delete({
      account_notification_channel: { id: accountNotificationChannel.id },
      type,
    });
  }

  /**
   * Add or remove one notification type across every channel the account has notifications for.
   */
  async setTypeForAllChannels(
    account_id: number,
    type: AccountNotificationTypeEnum,
    enabled: boolean
  ): Promise<{ updated: number }> {
    const channels = await this.accountNotificationChannelService.getAllByAccountId(account_id, {
      relations: { channel: true },
    });

    let updated = 0;
    for (const notificationChannel of channels) {
      const channelIdText = notificationChannel.channel?.id_text;
      if (!channelIdText) {
        continue;
      }
      if (enabled) {
        await this.create(account_id, channelIdText, type);
      } else {
        await this.delete(account_id, channelIdText, type);
      }
      updated += 1;
    }

    return { updated };
  }
}
