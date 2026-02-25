import type { EntityManager, FindManyOptions } from 'typeorm';
import type { AccountNotificationTypeEnum } from '@podverse/helpers';
import { AccountNotificationChannelType } from '@orm/entities/account/accountNotificationChannelType.js';
import { AccountNotificationChannelService } from '@orm/services/account/accountNotificationChannel.js';
import { AppDataSourceReadWrite } from '@orm/db/index.js';

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
}
