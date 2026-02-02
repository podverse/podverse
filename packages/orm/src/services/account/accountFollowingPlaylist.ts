import type { EntityManager, FindManyOptions } from 'typeorm';
import { Equal, Not } from 'typeorm';
import { AccountFollowingPlaylist } from '@orm/entities/account/accountFollowingPlaylist.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import { AccountService } from '@orm/services/account/account.js';
import { PlaylistService } from '../playlist/playlist.js';
import type { QueryParamsQueueMedium } from '@podverse/helpers';
import { getQueueMediumIdFromType, SharableStatusEnum } from '@podverse/helpers';

export class AccountFollowingPlaylistService extends BaseManyService<
  AccountFollowingPlaylist,
  'account'
> {
  private accountService: AccountService;
  private playlistService: PlaylistService;

  constructor(transactionalEntityManager?: EntityManager) {
    super(AccountFollowingPlaylist, 'account', transactionalEntityManager);
    this.accountService = new AccountService();
    this.playlistService = new PlaylistService();
  }

  async getFollowedPlaylistsPrivate(
    account_id: number,
    config?: FindManyOptions<AccountFollowingPlaylist>
  ): Promise<AccountFollowingPlaylist[]> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    return this._getAll(account, config);
  }

  async getFollowedPlaylistsPrivateWithCount(
    account_id: number,
    queueMediumType: QueryParamsQueueMedium | null,
    config?: FindManyOptions<AccountFollowingPlaylist>
  ): Promise<[AccountFollowingPlaylist[], number]> {
    const medium_id = getQueueMediumIdFromType(queueMediumType);

    return this.repositoryRead.findAndCount({
      ...config,
      where: {
        ...config?.where,
        account_id,
        ...(medium_id ? { playlist: { medium_id: Equal(medium_id) } } : {}),
      },
      relations: ['playlist', 'playlist.account', 'playlist.account.account_profile'],
    });
  }

  async getFollowedPlaylistsPublic(
    account_id: number,
    config?: FindManyOptions<AccountFollowingPlaylist>
  ): Promise<AccountFollowingPlaylist[]> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const publicConfig = {
      ...config,
      where: {
        ...config?.where,
        playlist: {
          sharable_status: Not(SharableStatusEnum.Private),
        },
      },
      relations: ['playlist'],
    };

    return this.repositoryRead.find(publicConfig);
  }

  async followPlaylist(
    account_id: number,
    playlist_id_text: string
  ): Promise<AccountFollowingPlaylist> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const playlist = await this.playlistService.getByIdText(playlist_id_text);
    if (!playlist) {
      throw new Error('Playlist not found.');
    }

    const dto = { playlist_id: playlist.id };

    return this._update(account, ['account_id', 'playlist_id'], dto);
  }

  async unfollowPlaylist(account_id: number, playlist_id_text: string): Promise<void> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const playlist = await this.playlistService.getByIdText(playlist_id_text);
    if (!playlist) {
      throw new Error('Playlist not found.');
    }

    return this._delete(account, { playlist_id: playlist.id });
  }
}
