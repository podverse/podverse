import { CreateAccountUPDeviceParams, UpdateAccountUPDeviceParams } from '@podverse/helpers';
import { In } from 'typeorm';
import { AccountUPDevice } from '@orm/entities/account/accountUPDevice';
import { BaseManyService } from '@orm/services/base/baseManyService';
import { AccountService } from '@orm/services/account/account';
import { AccountNotificationChannelService } from '@orm/services/account/accountNotificationChannel';
import { getDefaultLocale } from '@orm/config';

export class AccountUPDeviceService extends BaseManyService<AccountUPDevice, 'account'> {
  private accountService: AccountService;
  private accountNotificationChannelService: AccountNotificationChannelService;

  constructor() {
    super(AccountUPDevice, 'account');
    this.accountService = new AccountService();
    this.accountNotificationChannelService = new AccountNotificationChannelService();
  }

  async create(account_id: number, params: CreateAccountUPDeviceParams): Promise<AccountUPDevice> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }
    const { up_endpoint, up_auth_key } = params;

    const locale = account.account_settings?.account_settings_locale?.locale || getDefaultLocale();

    const existing = await this.repositoryRead.findOne({ where: { account_id } });
    if (existing) {
      await this.repositoryReadWrite.remove(existing);
    }

    const newDevice = this.repositoryReadWrite.create({
      account_id,
      up_endpoint,
      up_auth_key,
      locale,
    });
    return this.repositoryReadWrite.save(newDevice);
  }

  async update(
    account_id: number,
    params: UpdateAccountUPDeviceParams,
  ): Promise<AccountUPDevice> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }
    const { up_endpoint, up_auth_key } = params;

    const locale = account.account_settings?.account_settings_locale?.locale || getDefaultLocale();

    // Since there's only one device per account, find by account_id
    const existing = await this.repositoryRead.findOne({ where: { account_id } });
    if (existing) {
      existing.up_endpoint = up_endpoint;
      existing.up_auth_key = up_auth_key;
      existing.locale = locale;
      return this.repositoryReadWrite.save(existing);
    }

    throw new Error('UP Device not found for update.');
  }

  async delete(account_id: number): Promise<void> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    await this.repositoryReadWrite.delete({ account_id });
  }

  async getUPSubscriptionsByChannelIdText(channel_id_text: string): Promise<Array<{
    up_endpoint: string;
    up_auth_key: string | null;
    locale: string;
  }>> {
    const notificationChannels = await this.accountNotificationChannelService.getAllByChannelIdText(channel_id_text);
    const subscriptions: Array<{ up_endpoint: string; up_auth_key: string | null; locale: string }> = [];

    for (const notificationChannel of notificationChannels) {
      // Since there's only one device per account, use findOne
      const device = await this.repositoryRead.findOne({ where: { account_id: notificationChannel.account_id } });
      if (device) {
        subscriptions.push({
          up_endpoint: device.up_endpoint,
          up_auth_key: device.up_auth_key,
          locale: device.locale,
        });
      }
    }

    return subscriptions;
  }

  async getForAccount(account_id: number): Promise<AccountUPDevice | null> {
    return this.repositoryRead.findOne({ where: { account_id } });
  }

  async getAllForAccountIds(account_ids: number[]): Promise<AccountUPDevice[]> {
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
      .update(AccountUPDevice)
      .set({ locale })
      .where('account_id = :account_id', { account_id })
      .execute();
  }

  async deleteAllForAccount(account_id: number): Promise<void> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    await this.repositoryRead.createQueryBuilder()
      .delete()
      .from(AccountUPDevice)
      .where('account_id = :account_id', { account_id })
      .execute();
  }
}
