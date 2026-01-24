import { CreateAccountWebPushDeviceParams, UpdateAccountWebPushDeviceParams, DeleteAccountWebPushDeviceParams } from '@podverse/helpers';
import { In } from 'typeorm';
import { AccountWebPushDevice } from '@orm/entities/account/accountWebPushDevice';
import { BaseManyService } from '@orm/services/base/baseManyService';
import { AccountService } from '@orm/services/account/account';
import { AccountNotificationChannelService } from '@orm/services/account/accountNotificationChannel';
import { config } from '@orm/config';

export class AccountWebPushDeviceService extends BaseManyService<AccountWebPushDevice, 'account'> {
  private accountService: AccountService;
  private accountNotificationChannelService: AccountNotificationChannelService;

  constructor() {
    super(AccountWebPushDevice, 'account');
    this.accountService = new AccountService();
    this.accountNotificationChannelService = new AccountNotificationChannelService();
  }

  async create(account_id: number, params: CreateAccountWebPushDeviceParams): Promise<AccountWebPushDevice> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }
    const { endpoint, p256dh, auth } = params;

    const locale = account.account_settings?.account_settings_locale?.locale || config.defaults.account.settings.locale;

    const dto: Partial<AccountWebPushDevice> = { endpoint, p256dh, auth, locale };
    return this._update(account, ['endpoint', 'p256dh', 'auth', 'locale'], dto);
  }

  async update(
    account_id: number,
    params: UpdateAccountWebPushDeviceParams,
  ): Promise<AccountWebPushDevice> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }
    const { endpoint, p256dh, auth } = params;

    const locale = account.account_settings?.account_settings_locale?.locale || config.defaults.account.settings.locale;

    // Match by endpoint + account_id
    const existing = await this.repositoryRead.findOne({ where: { account_id, endpoint } });
    if (existing) {
      const dto: Partial<AccountWebPushDevice> = { account, endpoint, p256dh, auth, locale };
      return this._update(account, ['endpoint', 'p256dh', 'auth', 'locale'], dto, undefined, existing);
    }

    throw new Error('WebPush Device not found for update.');
  }

  async delete(account_id: number, params: DeleteAccountWebPushDeviceParams): Promise<void> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }
    const { endpoint } = params;

    const existing = await this.repositoryRead.findOne({ where: { account_id, endpoint } });
    if (existing) {
      return this._delete(account, { endpoint });
    }

    throw new Error('WebPush Device not found for deletion.');
  }

  async getWebPushSubscriptionsByChannelIdText(channel_id_text: string): Promise<Array<{
    endpoint: string;
    keys: { p256dh: string; auth: string };
    locale: string;
  }>> {
    const notificationChannels = await this.accountNotificationChannelService.getAllByChannelIdText(channel_id_text);
    const subscriptions: Array<{ endpoint: string; keys: { p256dh: string; auth: string }; locale: string }> = [];

    for (const notificationChannel of notificationChannels) {
      const webPushDevices = await this.repositoryRead.find({ where: { account_id: notificationChannel.account_id } });
      for (const device of webPushDevices) {
        subscriptions.push({
          endpoint: device.endpoint,
          keys: {
            p256dh: device.p256dh,
            auth: device.auth,
          },
          locale: device.locale,
        });
      }
    }

    return subscriptions;
  }

  async getAllForAccount(account_id: number): Promise<AccountWebPushDevice[]> {
    return this.repositoryRead.find({ where: { account_id } });
  }

  async getAllForAccountIds(account_ids: number[]): Promise<AccountWebPushDevice[]> {
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
      .update(AccountWebPushDevice)
      .set({ locale })
      .where('account_id = :account_id', { account_id })
      .execute();
  }
}
