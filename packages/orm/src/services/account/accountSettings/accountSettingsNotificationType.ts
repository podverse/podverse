import { AccountNotificationTypeValues } from '@podverse/helpers';
import { Repository } from 'typeorm';
import { AppDataSourceReadWrite, AppDataSourceRead } from '@orm/db';
import { AccountSettingsNotificationType } from '@orm/entities/account/accountSettings/accountSettingsNotificationType';
import { AccountSettings } from '@orm/entities/account/accountSettings/accountSettings';

type CreateDto = {
  account_id: number;
  type: AccountNotificationTypeValues;
};

export class AccountSettingsNotificationTypeService {
  protected repositoryReadWrite: Repository<AccountSettingsNotificationType>;
  protected repositoryRead: Repository<AccountSettingsNotificationType>;

  constructor() {
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(
      AccountSettingsNotificationType
    );
    this.repositoryRead = AppDataSourceRead.getRepository(AccountSettingsNotificationType);
  }

  async create(dto: CreateDto): Promise<AccountSettingsNotificationType> {
    const accountSettingsRepo = AppDataSourceRead.getRepository(AccountSettings);
    const accountSettings = await accountSettingsRepo.findOne({
      where: { account_id: dto.account_id },
      relations: ['account_settings_notification'],
    });
    if (!accountSettings || !accountSettings.account_settings_notification) {
      throw new Error('AccountSettingsNotification not found for account');
    }

    const parent = accountSettings.account_settings_notification;

    const obj = this.repositoryReadWrite.create({
      type: dto.type,
      account_settings_notification: parent,
    });

    return this.repositoryReadWrite.save(obj);
  }

  async delete(type: AccountNotificationTypeValues, account_id: number): Promise<void> {
    const accountSettingsRepo = AppDataSourceRead.getRepository(AccountSettings);
    const accountSettings = await accountSettingsRepo.findOne({
      where: { account_id },
      relations: ['account_settings_notification'],
    });

    if (!accountSettings || !accountSettings.account_settings_notification) {
      throw new Error('AccountSettingsNotification not found for account');
    }

    const parentId = accountSettings.account_settings_notification.id;

    const item = await this.repositoryRead.findOne({
      where: {
        type,
        account_settings_notification: {
          id: parentId,
        },
      },
      relations: ['account_settings_notification'],
    });
    if (!item) {
      return;
    }

    await this.repositoryReadWrite.remove(item);

    return;
  }
}
