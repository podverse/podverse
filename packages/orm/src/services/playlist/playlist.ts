import { Playlist } from '@orm/entities/playlist/playlist.js';
import { AccountService } from '@orm/services/account/account.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import type { EntityManager, FindManyOptions, FindOneOptions } from 'typeorm';
import { Equal, Not } from 'typeorm';

import type { MediumEnum, QueryParamsQueueMedium } from '@podverse/helpers';
import { getQueueMediumIdFromType, SharableStatusEnum } from '@podverse/helpers';

import { PlaylistResourceService } from './playlistResource.js';

export type PlaylistDto = {
  title?: string;
  description?: string;
  medium_id: MediumEnum;
  sharable_status_id: SharableStatusEnum;
  is_default_favorites?: boolean;
};

export class PlaylistService extends BaseManyService<Playlist, 'account'> {
  private accountService: AccountService;

  constructor(transactionalEntityManager?: EntityManager) {
    super(Playlist, 'account', transactionalEntityManager);
    this.accountService = new AccountService();
  }

  async create(account_id: number, dto: PlaylistDto): Promise<Playlist> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const whereKeys = [] as (keyof Playlist)[];

    return this._update(account, whereKeys, dto);
  }

  async update(account_id: number, playlist_id_text: string, dto: PlaylistDto): Promise<Playlist> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const playlist = await this._get(account, { id_text: playlist_id_text });
    if (!playlist) {
      throw new Error('Playlist not found.');
    }

    const whereKeys = ['id'] as (keyof Playlist)[];
    return this._update(account, whereKeys, dto, undefined, playlist);
  }

  async updateLastUpdatedAndItemCount(playlist_id_text: string): Promise<Playlist> {
    const playlist = await this.repositoryRead.findOne({ where: { id_text: playlist_id_text } });
    if (!playlist) {
      throw new Error('Playlist not found.');
    }

    const playlistResourceService = new PlaylistResourceService();
    const itemCount = await playlistResourceService.getAllByPlaylistIdTextCount(playlist_id_text);
    playlist.item_count = itemCount;
    playlist.last_updated = new Date();
    return this.repositoryReadWrite.save(playlist);
  }

  async delete(account_id: number, playlist_id_text: string): Promise<void> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    return this._delete(account, { id_text: playlist_id_text });
  }

  async getByIdText(
    playlist_id_text: string,
    options?: FindOneOptions<Playlist>
  ): Promise<Playlist | null> {
    return this.repositoryRead.findOne({
      where: { id_text: playlist_id_text },
      ...options,
    });
  }

  async getManyPublic(options?: FindManyOptions<Playlist>): Promise<Playlist[]> {
    return this.repositoryRead.find({
      where: {
        ...options?.where,
        sharable_status_id: SharableStatusEnum.Public,
      },
      ...options,
    });
  }

  async getManyPrivate(
    account_id: number,
    queueMediumType: QueryParamsQueueMedium | null,
    options?: FindManyOptions<Playlist>
  ): Promise<[Playlist[], number]> {
    const medium_id = getQueueMediumIdFromType(queueMediumType);

    return this.repositoryRead.findAndCount({
      ...options,
      where: {
        ...options?.where,
        account: {
          id: account_id,
        },
        ...(medium_id ? { medium_id: Equal(medium_id) } : {}),
      },
    });
  }

  async getOnePublic(
    playlist_id_text: string,
    options?: FindOneOptions<Playlist>
  ): Promise<Playlist | null> {
    return this.repositoryRead.findOne({
      where: {
        ...options?.where,
        id_text: playlist_id_text,
        sharable_status_id: Not(SharableStatusEnum.Private),
      },
      relations: ['account', 'account.account_profile'],
      ...options,
    });
  }

  async getOnePrivate(
    account_id_text: string,
    playlist_id_text: string,
    options?: FindOneOptions<Playlist>
  ): Promise<Playlist | null> {
    return this.repositoryRead.findOne({
      where: {
        ...options?.where,
        id_text: playlist_id_text,
        account: { id_text: account_id_text },
      },
      relations: ['account', 'account.account_profile'],
      ...options,
    });
  }

  async getAllFavoritesPrivate(account_id: number) {
    const options: FindManyOptions<Playlist> = {
      select: {
        id: true,
        id_text: true,
        medium: true,
        playlist_resources: {
          clip_id: true,
          item_id: true,
          item_soundbite_id: true,
          add_by_rss_hash_id: true,
        },
      },
      where: {
        is_default_favorites: true,
        account: { id: account_id },
      },
      relations: ['medium', 'playlist_resources'],
    };

    return this.repositoryRead.find(options);
  }

  async getManyByAccountIdTextAndCount(
    account_id_text: string,
    options?: FindManyOptions<Playlist>
  ): Promise<[Playlist[], number]> {
    return this.repositoryRead.findAndCount({
      ...options,
      where: {
        ...options?.where,
        account: {
          id_text: account_id_text,
        },
      },
    });
  }

  async getManyByAccountIdTextPublicAndCount(
    account_id_text: string,
    options?: FindManyOptions<Playlist>
  ): Promise<[Playlist[], number]> {
    return this.repositoryRead.findAndCount({
      ...options,
      where: {
        ...options?.where,
        account: {
          id_text: account_id_text,
        },
        sharable_status_id: SharableStatusEnum.Public,
      },
    });
  }
}
