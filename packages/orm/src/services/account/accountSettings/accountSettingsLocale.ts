import { Repository } from 'typeorm';
import { AppDataSourceReadWrite, AppDataSourceRead } from '@orm/db';
import { AccountSettingsLocale } from '@orm/entities/account/accountSettings/accountSettingsLocale';
import { AccountSettings } from '@orm/entities/account/accountSettings/accountSettings';
import { AccountFCMDevice } from '@orm/entities/account/accountFCMDevice';

type CreateDto = {
  account_id: number;
  locale: string;
};

type UpdateDto = {
  account_id: number;
  locale: string;
};

export class AccountSettingsLocaleService {
  protected repositoryReadWrite: Repository<AccountSettingsLocale>;
  protected repositoryRead: Repository<AccountSettingsLocale>;

  constructor() {
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(AccountSettingsLocale);
    this.repositoryRead = AppDataSourceRead.getRepository(AccountSettingsLocale);
  }

  async create(dto: CreateDto): Promise<AccountSettingsLocale> {
    const accountSettingsRepo = AppDataSourceRead.getRepository(AccountSettings);
    const accountSettings = await accountSettingsRepo.findOne({
      where: { account_id: dto.account_id },
    });

    if (!accountSettings) {
      throw new Error('AccountSettings not found for account');
    }

    const obj = this.repositoryReadWrite.create({
      account_settings_id: accountSettings.id,
      locale: dto.locale,
    });

    const saved = await this.repositoryReadWrite.save(obj);

    await this.updateAccountFCMDeviceLocales(dto.account_id, dto.locale);

    return saved;
  }

  async update(dto: UpdateDto): Promise<AccountSettingsLocale> {
    const accountSettingsRepo = AppDataSourceRead.getRepository(AccountSettings);
    const accountSettings = await accountSettingsRepo.findOne({
      where: { account_id: dto.account_id },
      relations: ['account_settings_locale'],
    });

    if (!accountSettings) {
      throw new Error('AccountSettings not found for account');
    }

    if (!accountSettings.account_settings_locale) {
      return this.create(dto);
    }

    const localeSettings = accountSettings.account_settings_locale;
    localeSettings.locale = dto.locale;

    const saved = await this.repositoryReadWrite.save(localeSettings);

    await this.updateAccountFCMDeviceLocales(dto.account_id, dto.locale);

    return saved;
  }

  private async updateAccountFCMDeviceLocales(account_id: number, locale: string): Promise<void> {
    const fcmDeviceRepo = AppDataSourceReadWrite.getRepository(AccountFCMDevice);
    const devices = await fcmDeviceRepo.find({ where: { account_id } });

    if (devices.length > 0) {
      for (const device of devices) {
        device.locale = locale;
      }
      await fcmDeviceRepo.save(devices);
    }
  }
}
