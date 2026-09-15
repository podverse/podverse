import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db/index.js';
import { AccountSettings } from '@orm/entities/account/accountSettings/accountSettings.js';
import { AccountSettingsNotification } from '@orm/entities/account/accountSettings/accountSettingsNotification.js';
import type { Repository } from 'typeorm';

type UpdateDto = {
  account_id: number;
  auto_enable_on_subscribe: boolean;
};

export class AccountSettingsNotificationService {
  protected repositoryRead: Repository<AccountSettingsNotification>;
  protected repositoryReadWrite: Repository<AccountSettingsNotification>;

  constructor() {
    this.repositoryRead = AppDataSourceRead.getRepository(AccountSettingsNotification);
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(AccountSettingsNotification);
  }

  async getByAccountId(account_id: number): Promise<AccountSettingsNotification | null> {
    const accountSettingsRepo = AppDataSourceRead.getRepository(AccountSettings);
    const accountSettings = await accountSettingsRepo.findOne({
      where: { account_id },
    });

    if (!accountSettings) {
      return null;
    }

    return this.repositoryRead.findOne({
      where: { account_settings_id: accountSettings.id },
      relations: { account_settings_notification_types: true },
    });
  }

  async update(dto: UpdateDto): Promise<AccountSettingsNotification> {
    const notification = await this.getByAccountId(dto.account_id);

    if (!notification) {
      throw new Error('AccountSettingsNotification not found for account');
    }

    notification.auto_enable_on_subscribe = dto.auto_enable_on_subscribe;

    return this.repositoryReadWrite.save(notification);
  }
}
