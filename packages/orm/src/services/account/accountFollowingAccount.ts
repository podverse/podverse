import { AccountFollowingAccount } from '@orm/entities/account/accountFollowingAccount.js';
import { AccountService } from '@orm/services/account/account.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import type { EntityManager, FindManyOptions } from 'typeorm';
import { Not } from 'typeorm';

import { SharableStatusEnum } from '@podverse/helpers';

export type AccountFollowingAccountDto = {
  following_account_id_text: string;
};

export class AccountFollowingAccountService extends BaseManyService<
  AccountFollowingAccount,
  'account'
> {
  private accountService: AccountService;

  constructor(transactionalEntityManager?: EntityManager) {
    super(AccountFollowingAccount, 'account', transactionalEntityManager);
    this.accountService = new AccountService();
  }

  async getFollowedAccountsPrivate(
    account_id: number,
    config?: FindManyOptions<AccountFollowingAccount>
  ): Promise<AccountFollowingAccount[]> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    return this._getAll(account, config);
  }

  async getFollowedAccountsPublic(
    account_id: number,
    config?: FindManyOptions<AccountFollowingAccount>
  ): Promise<AccountFollowingAccount[]> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const publicConfig = {
      ...config,
      where: {
        ...config?.where,
        following_account: {
          sharable_status: Not(SharableStatusEnum.Private),
        },
      },
      relations: ['following_account'],
    };

    return this.repositoryRead.find(publicConfig);
  }

  async followAccount(
    account_id: number,
    dto: AccountFollowingAccountDto
  ): Promise<AccountFollowingAccount> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const accountToFollow = await this.accountService.getByIdText(dto.following_account_id_text);
    if (!accountToFollow) {
      throw new Error('Account to follow not found.');
    }

    if (account.id === accountToFollow.id) {
      throw new Error('You cannot follow your own account.');
    }

    const finalDto = {
      following_account_id: accountToFollow.id,
    };

    return this._update(account, ['account_id', 'following_account_id'], finalDto);
  }

  async unfollowAccount(account_id: number, dto: AccountFollowingAccountDto): Promise<void> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const accountToUnfollow = await this.accountService.getByIdText(dto.following_account_id_text);
    if (!accountToUnfollow) {
      throw new Error('Account to unfollow not found.');
    }

    if (account.id === accountToUnfollow.id) {
      throw new Error('You cannot unfollow your own account.');
    }

    return this._delete(account, { following_account_id: accountToUnfollow.id });
  }
}
