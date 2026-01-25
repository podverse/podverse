import { EntityManager, FindManyOptions } from 'typeorm';
import { AccountFollowingAddByRSSChannel } from '@orm/entities/account/accountFollowingAddByRSSChannel';
import { BaseManyService } from '@orm/services/base/baseManyService';
import { AccountService } from '@orm/services/account/account';

export type AccountFollowingAddByRSSChannelDto = {
  feed_url: string;
  title?: string | null;
  image_url?: string | null;
};

export class AccountFollowingAddByRSSChannelService extends BaseManyService<AccountFollowingAddByRSSChannel, 'account'> {
  private accountService: AccountService;

  constructor(transactionalEntityManager?: EntityManager) {
    super(AccountFollowingAddByRSSChannel, 'account', transactionalEntityManager);
    this.accountService = new AccountService();
  }

  async getFollowedAddByRSSChannels(account_id: number, config?: FindManyOptions<AccountFollowingAddByRSSChannel>): Promise<AccountFollowingAddByRSSChannel[]> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    return this._getAll(account, config);
  }

  async addOrUpdateRSSChannel(account_id: number, dto: AccountFollowingAddByRSSChannelDto): Promise<AccountFollowingAddByRSSChannel> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    return this._update(
      account,
      ['account_id', 'feed_url'],
      dto,
    );
  }

  async removeRSSChannel(account_id: number, feed_url: string): Promise<void> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    return this._delete(account, { feed_url });
  }
}
