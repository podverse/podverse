import { CreateAccountFCMDeviceParams,
  UpdateAccountFCMDeviceParams, DeleteAccountFCMDeviceParams } from '@podverse/helpers';
import { In } from 'typeorm';
import { AccountFCMDevice } from '@orm/entities/account/accountFCMDevice';
import { BaseManyService } from '@orm/services/base/baseManyService';
import { AccountService } from '@orm/services/account/account';
import { AccountNotificationChannelService } from '@orm/services/account/accountNotificationChannel';
import { config } from '@orm/config';

export class AccountFCMDeviceService extends BaseManyService<AccountFCMDevice, 'account'> {
  private accountService: AccountService;
  private accountNotificationChannelService: AccountNotificationChannelService;

  constructor() {
    super(AccountFCMDevice, 'account');
    this.accountService = new AccountService();
    this.accountNotificationChannelService = new AccountNotificationChannelService();
  }

  async create(account_id: number, params: CreateAccountFCMDeviceParams): Promise<AccountFCMDevice> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }
    const { fcm_token, installation_id, platform } = params;

    const locale = account.account_settings?.account_settings_locale?.locale || config.defaults.account.settings.locale;

    const dto: Partial<AccountFCMDevice> = { fcm_token, installation_id, platform, locale };
    return this._update(account, ['fcm_token', 'installation_id', 'platform', 'locale'], dto);
  }

  async update(
    account_id: number,
    params: UpdateAccountFCMDeviceParams,
  ): Promise<AccountFCMDevice> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }
    const { new_fcm_token, installation_id, previous_fcm_token, platform } = params;

    const locale = account.account_settings?.account_settings_locale?.locale || config.defaults.account.settings.locale;

    // Prefer a match by installation_id + account_id
    if (installation_id) {
      const byInstall = await this.repositoryRead.findOne({ where: { account_id, installation_id } });
      if (byInstall) {
        const dto: Partial<AccountFCMDevice> = { account, fcm_token: new_fcm_token, platform, locale };
        return this._update(account, ['fcm_token', 'platform', 'locale'], dto, undefined, byInstall);
      }
    }

    // Fallback: match by previous_fcm_token + account_id
    if (previous_fcm_token) {
      const byToken = await this.repositoryRead.findOne({ where: { account_id, fcm_token: previous_fcm_token } });
      if (byToken) {
        const dto: Partial<AccountFCMDevice> = { account, fcm_token: new_fcm_token, platform, locale };
        if (installation_id) {dto.installation_id = installation_id;}
        return this._update(account, ['fcm_token', 'installation_id', 'platform', 'locale'], dto, undefined, byToken);
      }
    }

    throw new Error('FCM Device not found for update.');
  }

  async delete(account_id: number, params: DeleteAccountFCMDeviceParams): Promise<void> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }
    const { fcm_token, installation_id } = params;

    if (installation_id) {
      const byInstall = await this.repositoryRead.findOne({ where: { account_id, installation_id } });
      if (byInstall) {
        return this._delete(account, { installation_id });
      }
    }

    if (fcm_token) {
      const byToken = await this.repositoryRead.findOne({ where: { account_id, fcm_token } });
      if (byToken) {
        return this._delete(account, { fcm_token });
      }
    }

    throw new Error('FCM Device not found for deletion.');
  }

  async getFCMTokensByChannelIdText(channel_id_text: string): Promise<string[]> {
    const notificationChannels = await this.accountNotificationChannelService.getAllByChannelIdText(channel_id_text);
    const fcmTokens: string[] = [];

    for (const notificationChannel of notificationChannels) {
      const accountFCMDevices = await this.repositoryRead.find({ where: { account_id: notificationChannel.account_id } });
      for (const device of accountFCMDevices) {
        fcmTokens.push(device.fcm_token);
      }
    }

    return fcmTokens;
  }

  async getAllForAccount(account_id: number): Promise<AccountFCMDevice[]> {
    return this.repositoryRead.find({ where: { account_id } });
  }

  async getAllForAccountIds(account_ids: number[]): Promise<AccountFCMDevice[]> {
    if (account_ids.length === 0) {return [];}
    return this.repositoryRead.find({ where: { account_id: In(account_ids) } });
  }

  async updateLocaleForAccount(account_id: number, params: { locale: string }): Promise<void> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const { locale } = params;

    await this.repositoryRead.createQueryBuilder()
      .update(AccountFCMDevice)
      .set({ locale })
      .where('account_id = :account_id', { account_id })
      .execute();
  }
}
