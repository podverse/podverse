import { Playlist } from '@orm/entities/playlist/playlist.js';
import { PlaylistResource } from '@orm/entities/playlist/playlistResource.js';
import { AccountService } from '@orm/services/account/account.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import { ClipService } from '@orm/services/clip.js';
import { ItemService } from '@orm/services/item/item.js';
import type { EntityManager, FindManyOptions, FindOneOptions } from 'typeorm';
import { Equal, In, Not } from 'typeorm';

import type { MediumEnum, QueryParamsQueueMedium } from '@podverse/helpers';
import {
  getQueueMediumIdFromType,
  MediumEnum as MediumId,
  SharableStatusEnum,
} from '@podverse/helpers';

import { PlaylistResourceService } from './playlistResource.js';

export type PlaylistDto = {
  title?: string;
  description?: string;
  medium_id: MediumEnum;
  sharable_status_id: SharableStatusEnum;
  is_default_likes?: boolean;
};

/** User-facing playlist PATCH: medium is not mutable after create. */
export type PlaylistUserUpdateDto = {
  title?: string;
  description?: string;
  sharable_status_id: SharableStatusEnum;
};

export type LikesMembershipQueryDto = {
  item_id_texts?: string[];
  clip_id_texts?: string[];
  add_by_rss_hash_ids?: string[];
};

export type LikesMembershipResult = {
  item_id_texts: string[];
  clip_id_texts: string[];
  add_by_rss_hash_ids: string[];
};

export class PlaylistService extends BaseManyService<Playlist, 'account'> {
  private accountService: AccountService;
  private itemService: ItemService;
  private clipService: ClipService;

  constructor(transactionalEntityManager?: EntityManager) {
    super(Playlist, 'account', transactionalEntityManager);
    this.accountService = new AccountService();
    this.itemService = new ItemService();
    this.clipService = new ClipService(transactionalEntityManager);
  }

  private static getLikePlaylistMediumId(sourceMediumId: number): MediumEnum {
    return sourceMediumId === MediumId.Music || sourceMediumId === MediumId.PublisherMusic
      ? MediumId.Music
      : MediumId.AV;
  }

  async create(account_id: number, dto: PlaylistDto): Promise<Playlist> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const whereKeys = [] as (keyof Playlist)[];

    return this._update(account, whereKeys, dto);
  }

  async update(
    account_id: number,
    playlist_id_text: string,
    dto: PlaylistUserUpdateDto
  ): Promise<Playlist> {
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
    const userOrder = options?.order;
    const order: FindManyOptions<Playlist>['order'] = userOrder
      ? {
          is_default_likes: 'DESC',
          ...(userOrder as Record<string, 'ASC' | 'DESC'>),
        }
      : { is_default_likes: 'DESC' };

    return this.repositoryRead.findAndCount({
      ...options,
      order,
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
      relations: {
        account: {
          account_profile: true,
        },
      },
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
      relations: {
        account: {
          account_profile: true,
        },
      },
      ...options,
    });
  }

  async getAllLikesPrivate(account_id: number, includeResources = true) {
    if (!includeResources) {
      return this.repositoryRead.find({
        where: {
          is_default_likes: true,
          account: { id: account_id },
        },
        relations: {
          medium: true,
        },
      });
    }

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
        is_default_likes: true,
        account: { id: account_id },
      },
      relations: { medium: true, playlist_resources: true },
    };

    return this.repositoryRead.find(options);
  }

  async getOrCreateDefaultLikesPlaylist(
    account_id: number,
    medium_id: MediumEnum
  ): Promise<Playlist> {
    const existing = await this.repositoryRead.findOne({
      where: {
        account: { id: account_id },
        medium_id,
        is_default_likes: true,
      },
    });

    if (existing) {
      return existing;
    }

    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    try {
      return await this._update(account, ['account', 'medium_id', 'is_default_likes'], {
        medium_id,
        sharable_status_id: SharableStatusEnum.Private,
        is_default_likes: true,
      });
    } catch {
      const retry = await this.repositoryRead.findOne({
        where: {
          account: { id: account_id },
          medium_id,
          is_default_likes: true,
        },
      });
      if (retry) {
        return retry;
      }
      throw new Error('Unable to resolve default likes playlist.');
    }
  }

  async hasItemLike(playlist_id: number, item_id: number): Promise<boolean> {
    const count = await this.repositoryRead.manager.getRepository(PlaylistResource).count({
      where: {
        playlist: { id: playlist_id },
        item: { id: item_id },
      },
    });

    return count > 0;
  }

  async hasClipLike(playlist_id: number, clip_id: number): Promise<boolean> {
    const count = await this.repositoryRead.manager.getRepository(PlaylistResource).count({
      where: {
        playlist: { id: playlist_id },
        clip: { id: clip_id },
      },
    });

    return count > 0;
  }

  async hasAddByRSSLike(playlist_id: number, add_by_rss_hash_id: string): Promise<boolean> {
    const count = await this.repositoryRead.manager.getRepository(PlaylistResource).count({
      where: {
        playlist: { id: playlist_id },
        add_by_rss_hash_id,
      },
    });

    return count > 0;
  }

  async getLikesMembership(
    account_id: number,
    query: LikesMembershipQueryDto
  ): Promise<LikesMembershipResult> {
    const likesPlaylists = await this.repositoryRead.find({
      where: {
        account: { id: account_id },
        is_default_likes: true,
      },
      select: {
        id: true,
        medium_id: true,
      },
    });

    const avPlaylistId = likesPlaylists.find((playlist) => playlist.medium_id === MediumId.AV)?.id;
    const musicPlaylistId = likesPlaylists.find(
      (playlist) => playlist.medium_id === MediumId.Music
    )?.id;

    const playlistResourceRepo = this.repositoryRead.manager.getRepository(PlaylistResource);

    const membership: LikesMembershipResult = {
      item_id_texts: [],
      clip_id_texts: [],
      add_by_rss_hash_ids: [],
    };

    if (query.item_id_texts && query.item_id_texts.length > 0) {
      const items = await Promise.all(
        query.item_id_texts.map((itemIdText) =>
          this.itemService.getByIdText(itemIdText, { channel: true })
        )
      );

      const itemLookup = new Map<string, { itemId: number; mediumId: MediumEnum }>();
      for (const item of items) {
        if (!item) {
          continue;
        }

        itemLookup.set(item.id_text, {
          itemId: item.id,
          mediumId: PlaylistService.getLikePlaylistMediumId(item.channel.medium_id),
        });
      }

      const itemIds = Array.from(itemLookup.values()).map((value) => value.itemId);
      if (itemIds.length > 0) {
        const matchingResources = await playlistResourceRepo.find({
          where: {
            item: { id: In(itemIds) },
            playlist: {
              id: In([avPlaylistId, musicPlaylistId].filter((id): id is number => Boolean(id))),
            },
          },
          relations: {
            item: true,
            playlist: true,
          },
          select: {
            item: { id: true },
            playlist: { id: true },
          },
        });

        const byItemId = new Set(
          matchingResources.map((resource) => `${resource.item.id}:${resource.playlist.id}`)
        );

        for (const [itemIdText, value] of itemLookup.entries()) {
          const targetPlaylistId =
            value.mediumId === MediumId.Music ? (musicPlaylistId ?? -1) : (avPlaylistId ?? -1);
          if (byItemId.has(`${value.itemId}:${targetPlaylistId}`)) {
            membership.item_id_texts.push(itemIdText);
          }
        }
      }
    }

    if (query.clip_id_texts && query.clip_id_texts.length > 0) {
      const clips = await Promise.all(
        query.clip_id_texts.map((clipIdText) => this.clipService.getByIdText(clipIdText))
      );

      const clipLookup = new Map<string, number>();
      for (const clip of clips) {
        if (clip) {
          clipLookup.set(clip.id_text, clip.id);
        }
      }

      if (avPlaylistId && clipLookup.size > 0) {
        const matchingResources = await playlistResourceRepo.find({
          where: {
            clip: { id: In(Array.from(clipLookup.values())) },
            playlist: { id: avPlaylistId },
          },
          relations: {
            clip: true,
          },
          select: {
            clip: { id: true },
          },
        });

        const likedClipIds = new Set(matchingResources.map((resource) => resource.clip.id));
        for (const [clipIdText, clipId] of clipLookup.entries()) {
          if (likedClipIds.has(clipId)) {
            membership.clip_id_texts.push(clipIdText);
          }
        }
      }
    }

    if (query.add_by_rss_hash_ids && query.add_by_rss_hash_ids.length > 0) {
      const playlistIds = [avPlaylistId, musicPlaylistId].filter((id): id is number => Boolean(id));

      if (playlistIds.length > 0) {
        const matchingResources = await playlistResourceRepo.find({
          where: {
            add_by_rss_hash_id: In(query.add_by_rss_hash_ids),
            playlist: { id: In(playlistIds) },
          },
          select: {
            add_by_rss_hash_id: true,
          },
        });

        const likedHashIds = new Set(
          matchingResources
            .map((resource) => resource.add_by_rss_hash_id)
            .filter((value): value is string => Boolean(value))
        );

        for (const hashId of query.add_by_rss_hash_ids) {
          if (likedHashIds.has(hashId)) {
            membership.add_by_rss_hash_ids.push(hashId);
          }
        }
      }
    }

    return membership;
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
