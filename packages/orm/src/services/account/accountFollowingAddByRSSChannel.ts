import { AccountFollowingAddByRSSChannel } from '@orm/entities/account/accountFollowingAddByRSSChannel.js';
import {
  decryptCredentials,
  encryptCredentials,
  isEncryptionConfigured,
} from '@orm/lib/credentialsEncryption.js';
import { AccountService } from '@orm/services/account/account.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import type { EntityManager, FindManyOptions, FindOptionsSelect } from 'typeorm';

export type AccountFollowingAddByRSSChannelDto = {
  feed_url: string;
  title?: string | null;
  image_url?: string | null;
  basic_auth_username?: string | null;
  basic_auth_password?: string | null;
};

export type AddByRSSFeedCredentials = {
  username: string;
  password: string;
};

export class AccountFollowingAddByRSSChannelService extends BaseManyService<
  AccountFollowingAddByRSSChannel,
  'account'
> {
  private accountService: AccountService;

  constructor(transactionalEntityManager?: EntityManager) {
    super(AccountFollowingAddByRSSChannel, 'account', transactionalEntityManager);
    this.accountService = new AccountService();
  }

  async getFollowedAddByRSSChannels(
    account_id: number,
    config?: FindManyOptions<AccountFollowingAddByRSSChannel>
  ): Promise<AccountFollowingAddByRSSChannel[]> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const safeSelect: FindOptionsSelect<AccountFollowingAddByRSSChannel> = {
      account_id: true,
      feed_url: true,
      title: true,
      image_url: true,
      basic_auth_username: true,
    };
    const mergedConfig: FindManyOptions<AccountFollowingAddByRSSChannel> = {
      select: safeSelect,
      ...config,
    };
    const rows = await this._getAll(account, mergedConfig);
    return rows.map((row) => {
      if (row.basic_auth_username?.startsWith('v1:')) {
        return { ...row, basic_auth_username: '[saved]' as string | null };
      }
      return row;
    });
  }

  async getFollowedAddByRSSChannelCount(account_id: number): Promise<number> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    return this.repositoryRead.count({
      where: {
        account_id: account.id,
      },
    });
  }

  async hasFollowedAddByRSSChannel(account_id: number, feed_url: string): Promise<boolean> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const existing = await this._get(account, { feed_url });
    return !!existing;
  }

  async getCredentialsForFeed(
    account_id: number,
    feed_url: string
  ): Promise<AddByRSSFeedCredentials | null> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      return null;
    }
    const row = await this._get(account, { feed_url });
    if (!row?.basic_auth_username || !row?.basic_auth_password) {
      return null;
    }
    const username = decryptCredentials(row.basic_auth_username);
    const password = decryptCredentials(row.basic_auth_password);
    if (username === null || password === null) {
      return null;
    }
    return { username, password };
  }

  async addOrUpdateRSSChannel(
    account_id: number,
    dto: AccountFollowingAddByRSSChannelDto
  ): Promise<AccountFollowingAddByRSSChannel> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    let payload = dto;
    if (
      isEncryptionConfigured() &&
      dto.basic_auth_username !== undefined &&
      dto.basic_auth_username !== null &&
      dto.basic_auth_username !== '' &&
      dto.basic_auth_password !== undefined &&
      dto.basic_auth_password !== null &&
      dto.basic_auth_password !== ''
    ) {
      payload = {
        ...dto,
        basic_auth_username: encryptCredentials(dto.basic_auth_username),
        basic_auth_password: encryptCredentials(dto.basic_auth_password),
      };
    }

    return this._update(account, ['account_id', 'feed_url'], payload);
  }

  async removeRSSChannel(account_id: number, feed_url: string): Promise<void> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    return this._delete(account, { feed_url });
  }
}
