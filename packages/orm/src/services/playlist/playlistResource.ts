// TODO: get rid of "any" in the file
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PlaylistResourceIdTextOptions } from '@podverse/helpers';
import { getAddByRSSHashId, PAGINATION } from '@podverse/helpers';
import type {
  EntityManager,
  FindManyOptions,
  FindOptionsOrderValue,
  FindOptionsWhere,
} from 'typeorm';
import { MoreThan, LessThan } from 'typeorm';
import { PlaylistResource } from '@orm/entities/playlist/playlistResource.js';
import { PlaylistService } from './playlist.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import { ClipService } from '../clip.js';
import { ItemService } from '../item/item.js';
import { ItemSoundbiteService } from '../item/itemSoundbite.js';
import { listResourceRelations } from '../queue/queueResource.js';

const PLAYLIST_LIST_POSITION_INCREMENT = 0.00000001;

export class PlaylistResourceService extends BaseManyService<PlaylistResource, 'playlist'> {
  private playlistService: PlaylistService;
  private clipService: ClipService;
  private itemService: ItemService;
  private itemSoundbiteService: ItemSoundbiteService;

  constructor(transactionalEntityManager?: EntityManager) {
    super(PlaylistResource, 'playlist', transactionalEntityManager);
    this.playlistService = new PlaylistService(transactionalEntityManager);
    this.clipService = new ClipService(transactionalEntityManager);
    this.itemService = new ItemService();
    this.itemSoundbiteService = new ItemSoundbiteService(transactionalEntityManager);
  }

  private filterPrivateClips<
    T extends { clip?: { sharable_status_id?: number | null; account?: { id?: number } } },
  >(resources: T[], account_id: number | null): T[] {
    return resources.filter((resource) => {
      if (resource.clip?.sharable_status_id === 3) {
        // Only include private clips if owned by the account
        return resource.clip.account?.id === account_id;
      }
      return true;
    });
  }

  async getManyByPlaylistIdText(
    playlist_id_text: string,
    account_id: number | null,
    options: Partial<FindManyOptions<PlaylistResource>> = {}
  ): Promise<PlaylistResource[]> {
    const playlist = await this.playlistService.getByIdText(playlist_id_text);
    if (!playlist) {
      throw new Error('Playlist not found.');
    }

    const defaultOptions: FindManyOptions<PlaylistResource> = {
      where: { playlist: { id: playlist.id } },
      order: { list_position: 'ASC' as FindOptionsOrderValue },
      relations: listResourceRelations,
    };

    const results = await this.repositoryRead.find({
      ...defaultOptions,
      ...options,
      where: { ...defaultOptions.where, ...(options.where || {}) },
    });

    return this.filterPrivateClips(results, account_id);
  }

  async getManyForQueueByListPosition(
    playlist_id_text: string,
    idTextOptions: PlaylistResourceIdTextOptions,
    direction: 'forward' | 'backward',
    account_id: number | null
  ): Promise<PlaylistResource[]> {
    if (
      !idTextOptions.item_id_text &&
      !idTextOptions.clip_id_text &&
      !idTextOptions.item_soundbite_id_text
    ) {
      throw new Error(
        'One of item_id_text, clip_id_text, or item_soundbite_id_text must be provided'
      );
    }

    const playlist = await this.playlistService.getByIdText(playlist_id_text);
    if (!playlist) {
      throw new Error('Playlist not found.');
    }

    let list_position = '0';

    if (idTextOptions.clip_id_text) {
      const clip = await this.clipService.getByIdText(idTextOptions.clip_id_text);
      if (clip) {
        const pr = await this.repositoryRead.findOne({
          where: { playlist: { id: playlist.id }, clip: { id: clip.id } },
        });
        if (pr) {
          list_position = pr.list_position;
        }
      }
    } else if (idTextOptions.item_soundbite_id_text) {
      const soundbite = await this.itemSoundbiteService.getByIdText(
        idTextOptions.item_soundbite_id_text
      );
      if (soundbite) {
        const pr = await this.repositoryRead.findOne({
          where: { playlist: { id: playlist.id }, item_soundbite: { id: soundbite.id } },
        });
        if (pr) {
          list_position = pr.list_position;
        }
      }
    } else if (idTextOptions.item_id_text) {
      const item = await this.itemService.getByIdText(idTextOptions.item_id_text);
      if (item) {
        const pr = await this.repositoryRead.findOne({
          where: { playlist: { id: playlist.id }, item: { id: item.id } },
        });
        if (pr) {
          list_position = pr.list_position;
        }
      }
    }

    const where: FindOptionsWhere<PlaylistResource> = {
      playlist: { id: playlist.id },
      list_position: direction === 'forward' ? MoreThan(list_position) : LessThan(list_position),
    };

    const order: FindOptionsOrderValue = direction === 'forward' ? 'ASC' : 'DESC';

    const results = await this.repositoryRead.find({
      where,
      order: { list_position: order },
      take: PAGINATION.DEFAULT_LIMIT,
      relations: listResourceRelations,
    });

    return this.filterPrivateClips(results, account_id);
  }

  async getManyByPlaylistShuffle(
    playlist_id_text: string,
    shuffleHash: string,
    account_id: number | null,
    options?: FindManyOptions<PlaylistResource>
  ): Promise<PlaylistResource[]> {
    const playlist = await this.playlistService.getByIdText(playlist_id_text);
    if (!playlist) {
      throw new Error('Playlist not found.');
    }

    if (!shuffleHash) {
      throw new Error('Shuffle hash is required.');
    }

    const skip = options?.skip ?? 0;
    const take = options?.take ?? PAGINATION.DEFAULT_LIMIT;

    const createBaseQueryBuilder = () => {
      return this.repositoryRead
        .createQueryBuilder('pr')
        .where('pr.playlist_id = :playlistId', { playlistId: playlist.id })
        .leftJoinAndSelect('pr.clip', 'clip')
        .leftJoinAndSelect('clip.item', 'clip_item')
        .leftJoinAndSelect('clip_item.item_about', 'clip_item_about')
        .leftJoinAndSelect('clip_item.item_enclosures', 'clip_item_enclosures')
        .leftJoinAndSelect(
          'clip_item_enclosures.item_enclosure_sources',
          'clip_item_enclosure_sources'
        )
        .leftJoinAndSelect('clip_item.item_images', 'clip_item_images')
        .leftJoinAndSelect('clip_item.channel', 'clip_channel')
        .leftJoinAndSelect('clip_channel.channel_images', 'clip_channel_images')
        .leftJoinAndSelect('clip.sharable_status', 'sharable_status')
        .leftJoinAndSelect('clip.account', 'clip_account')
        .leftJoinAndSelect('pr.item', 'item')
        .leftJoinAndSelect('item.item_about', 'item_about')
        .leftJoinAndSelect('item.item_enclosures', 'item_enclosures')
        .leftJoinAndSelect('item_enclosures.item_enclosure_sources', 'item_enclosure_sources')
        .leftJoinAndSelect('item.item_images', 'item_images')
        .leftJoinAndSelect('item.channel', 'item_channel')
        .leftJoinAndSelect('item_channel.channel_images', 'item_channel_images')
        .leftJoinAndSelect('pr.item_soundbite', 'item_soundbite')
        .leftJoinAndSelect('item_soundbite.item', 'soundbite_item')
        .leftJoinAndSelect('soundbite_item.item_about', 'soundbite_item_about')
        .leftJoinAndSelect('soundbite_item.item_enclosures', 'soundbite_item_enclosures')
        .leftJoinAndSelect(
          'soundbite_item_enclosures.item_enclosure_sources',
          'soundbite_item_enclosure_sources'
        )
        .leftJoinAndSelect('soundbite_item.item_images', 'soundbite_item_images')
        .leftJoinAndSelect('soundbite_item.channel', 'soundbite_channel')
        .leftJoinAndSelect('soundbite_channel.channel_images', 'soundbite_channel_images');
    };

    // Use a deterministic random order based on shuffleHash
    const query = createBaseQueryBuilder()
      .addSelect('MD5(pr.id::text || (:shuffleHash)::text)', 'shuffle_order')
      .setParameter('shuffleHash', String(shuffleHash))
      .orderBy('shuffle_order', 'ASC')
      .skip(skip)
      .take(take);

    const result = await query.getRawAndEntities();
    return this.filterPrivateClips(result.entities, account_id);
  }

  async getAllByPlaylistIdText(
    playlist_id_text: string,
    account_id: number | null
  ): Promise<PlaylistResource[]> {
    const playlist = await this.playlistService.getByIdText(playlist_id_text);
    if (!playlist) {
      throw new Error('Playlist not found.');
    }

    const options = {
      where: { playlist: { id: playlist.id } },
      order: { list_position: 'ASC' as FindOptionsOrderValue },
      relations: listResourceRelations,
    };

    const results = await this.repositoryRead.find(options);
    return this.filterPrivateClips(results, account_id);
  }

  async getAllByPlaylistIdTextCount(playlist_id_text: string): Promise<number> {
    const playlist = await this.playlistService.getByIdText(playlist_id_text);
    if (!playlist) {
      throw new Error('Playlist not found.');
    }

    return this.repositoryRead.count({ where: { playlist: { id: playlist.id } } });
  }

  async getFirstAndLastItemsByPlaylistIdText(
    playlist_id_text: string
  ): Promise<{ firstItem: PlaylistResource | null; lastItem: PlaylistResource | null }> {
    const playlist = await this.playlistService.getByIdText(playlist_id_text);
    if (!playlist) {
      throw new Error('Playlist not found.');
    }

    const firstItem = await this.repositoryRead.findOne({
      where: { playlist },
      order: { list_position: 'ASC' },
    });

    const lastItem = await this.repositoryRead.findOne({
      where: { playlist },
      order: { list_position: 'DESC' },
    });

    return { firstItem, lastItem };
  }

  private async addResourceToPlaylist(
    playlist_id_text: string,
    resource_id_text: string,
    resourceService: any,
    resourceKey: keyof PlaylistResource,
    calculatePosition: (
      firstItem: PlaylistResource | null,
      lastItem: PlaylistResource | null
    ) => string
  ): Promise<PlaylistResource> {
    const playlist = await this.playlistService.getByIdText(playlist_id_text);
    if (!playlist) {
      throw new Error('Playlist not found.');
    }

    const resource = await resourceService.getByIdText(resource_id_text);
    if (!resource) {
      throw new Error(`${resourceKey} not found.`);
    }

    const { firstItem, lastItem } =
      await this.getFirstAndLastItemsByPlaylistIdText(playlist_id_text);
    const list_position = calculatePosition(
      firstItem as PlaylistResource,
      lastItem as PlaylistResource
    );

    const finalDto = {
      [resourceKey]: resource.id,
      list_position,
    };

    const results = await this._update(playlist, ['playlist', resourceKey], finalDto);

    await this.playlistService.updateLastUpdatedAndItemCount(playlist.id_text);

    return results;
  }

  private async addResourceToPlaylistHelper(
    playlist_id_text: string,
    resource_id_text: string,
    resourceService: any,
    resourceKey: keyof PlaylistResource,
    calculatePosition: (
      firstItem: PlaylistResource | null,
      lastItem: PlaylistResource | null
    ) => string
  ): Promise<PlaylistResource> {
    return this.addResourceToPlaylist(
      playlist_id_text,
      resource_id_text,
      resourceService,
      resourceKey,
      calculatePosition
    );
  }

  private async addResourceToPlaylistFirst(
    playlist_id_text: string,
    resource_id_text: string,
    resourceService: any,
    resourceKey: keyof PlaylistResource
  ): Promise<PlaylistResource> {
    return this.addResourceToPlaylistHelper(
      playlist_id_text,
      resource_id_text,
      resourceService,
      resourceKey,
      (firstItem) => {
        const newPosition = firstItem
          ? parseFloat(firstItem.list_position) - PLAYLIST_LIST_POSITION_INCREMENT
          : 1;
        return newPosition < 0 ? '0' : newPosition.toString();
      }
    );
  }

  private async addResourceToPlaylistLast(
    playlist_id_text: string,
    resource_id_text: string,
    resourceService: any,
    resourceKey: keyof PlaylistResource
  ): Promise<PlaylistResource> {
    return this.addResourceToPlaylistHelper(
      playlist_id_text,
      resource_id_text,
      resourceService,
      resourceKey,
      (_, lastItem) => {
        return lastItem
          ? (parseFloat(lastItem.list_position) + PLAYLIST_LIST_POSITION_INCREMENT).toString()
          : '1';
      }
    );
  }

  private async addResourceToPlaylistBetween(
    playlist_id_text: string,
    resource_id_text: string,
    resourceService: any,
    resourceKey: keyof PlaylistResource,
    position1: number,
    position2: number
  ): Promise<PlaylistResource> {
    if (position1 === undefined || position2 === undefined) {
      throw new Error('Both position1 and position2 must be provided.');
    }

    if (position1 >= position2) {
      throw new Error('Position1 should be less than Position2.');
    }

    return this.addResourceToPlaylistHelper(
      playlist_id_text,
      resource_id_text,
      resourceService,
      resourceKey,
      () => {
        const pos1 = parseFloat(position1.toString());
        const pos2 = parseFloat(position2.toString());

        if (isNaN(pos1) || isNaN(pos2)) {
          throw new Error('Invalid positions provided.');
        }

        return ((pos1 + pos2) / 2).toString();
      }
    );
  }

  private async removeResourceFromPlaylist(
    playlist_id_text: string,
    resource_id_text: string,
    resourceService: any,
    resourceKey: keyof PlaylistResource
  ): Promise<void> {
    const playlist = await this.playlistService.getByIdText(playlist_id_text);
    if (!playlist) {
      throw new Error('Playlist not found.');
    }

    const resource = await resourceService.getByIdText(resource_id_text);
    if (!resource) {
      throw new Error(`${resourceKey} not found.`);
    }

    const results = await this._delete(playlist, { [resourceKey]: resource.id });

    await this.playlistService.updateLastUpdatedAndItemCount(playlist.id_text);

    return results;
  }

  async addClipToPlaylistFirst(
    playlist_id_text: string,
    clip_id_text: string
  ): Promise<PlaylistResource> {
    return this.addResourceToPlaylistFirst(
      playlist_id_text,
      clip_id_text,
      this.clipService,
      'clip_id'
    );
  }

  async addClipToPlaylistLast(
    playlist_id_text: string,
    clip_id_text: string
  ): Promise<PlaylistResource> {
    return this.addResourceToPlaylistLast(
      playlist_id_text,
      clip_id_text,
      this.clipService,
      'clip_id'
    );
  }

  async addClipToPlaylistBetween(
    playlist_id_text: string,
    clip_id_text: string,
    position1: number,
    position2: number
  ): Promise<PlaylistResource> {
    return this.addResourceToPlaylistBetween(
      playlist_id_text,
      clip_id_text,
      this.clipService,
      'clip_id',
      position1,
      position2
    );
  }

  async removeClipFromPlaylist(playlist_id_text: string, clip_id_text: string): Promise<void> {
    return this.removeResourceFromPlaylist(
      playlist_id_text,
      clip_id_text,
      this.clipService,
      'clip_id'
    );
  }

  async addItemToPlaylistFirst(
    playlist_id_text: string,
    item_id_text: string
  ): Promise<PlaylistResource> {
    return this.addResourceToPlaylistFirst(
      playlist_id_text,
      item_id_text,
      this.itemService,
      'item_id'
    );
  }

  async addItemToPlaylistLast(
    playlist_id_text: string,
    item_id_text: string
  ): Promise<PlaylistResource> {
    return this.addResourceToPlaylistLast(
      playlist_id_text,
      item_id_text,
      this.itemService,
      'item_id'
    );
  }

  async addItemToPlaylistBetween(
    playlist_id_text: string,
    item_id_text: string,
    position1: number,
    position2: number
  ): Promise<PlaylistResource> {
    return this.addResourceToPlaylistBetween(
      playlist_id_text,
      item_id_text,
      this.itemService,
      'item_id',
      position1,
      position2
    );
  }

  async removeItemFromPlaylist(playlist_id_text: string, item_id_text: string): Promise<void> {
    return this.removeResourceFromPlaylist(
      playlist_id_text,
      item_id_text,
      this.itemService,
      'item_id'
    );
  }

  async addItemSoundbiteToPlaylistFirst(
    playlist_id_text: string,
    item_soundbite_id_text: string
  ): Promise<PlaylistResource> {
    return this.addResourceToPlaylistFirst(
      playlist_id_text,
      item_soundbite_id_text,
      this.itemSoundbiteService,
      'item_soundbite_id'
    );
  }

  async addItemSoundbiteToPlaylistLast(
    playlist_id_text: string,
    item_soundbite_id_text: string
  ): Promise<PlaylistResource> {
    return this.addResourceToPlaylistLast(
      playlist_id_text,
      item_soundbite_id_text,
      this.itemSoundbiteService,
      'item_soundbite_id'
    );
  }

  async addItemSoundbiteToPlaylistBetween(
    playlist_id_text: string,
    item_soundbite_id_text: string,
    position1: number,
    position2: number
  ): Promise<PlaylistResource> {
    return this.addResourceToPlaylistBetween(
      playlist_id_text,
      item_soundbite_id_text,
      this.itemSoundbiteService,
      'item_soundbite_id',
      position1,
      position2
    );
  }

  async removeItemSoundbiteFromPlaylist(
    playlist_id_text: string,
    item_soundbite_id_text: string
  ): Promise<void> {
    return this.removeResourceFromPlaylist(
      playlist_id_text,
      item_soundbite_id_text,
      this.itemSoundbiteService,
      'item_soundbite_id'
    );
  }

  private async addItemAddByRSSToPlaylist(
    playlist_id_text: string,
    add_by_rss_resource_data: object,
    calculatePosition: (
      firstItem: PlaylistResource | null,
      lastItem: PlaylistResource | null
    ) => string
  ): Promise<PlaylistResource> {
    const playlist = await this.playlistService.getByIdText(playlist_id_text);
    if (!playlist) {
      throw new Error('Playlist not found.');
    }

    const { firstItem, lastItem } =
      await this.getFirstAndLastItemsByPlaylistIdText(playlist_id_text);

    const list_position = calculatePosition(
      firstItem as PlaylistResource,
      lastItem as PlaylistResource
    );
    const add_by_rss_hash_id = getAddByRSSHashId(add_by_rss_resource_data);

    const finalDto = {
      add_by_rss_resource_data,
      list_position,
      add_by_rss_hash_id,
    };

    const results = await this._update(playlist, ['playlist', 'add_by_rss_hash_id'], finalDto);

    await this.playlistService.updateLastUpdatedAndItemCount(playlist.id_text);

    return results;
  }

  private async addItemAddByRSSToPlaylistHelper(
    playlist_id_text: string,
    add_by_rss_resource_data: object,
    calculatePosition: (
      firstItem: PlaylistResource | null,
      lastItem: PlaylistResource | null
    ) => string
  ): Promise<PlaylistResource> {
    return this.addItemAddByRSSToPlaylist(
      playlist_id_text,
      add_by_rss_resource_data,
      calculatePosition
    );
  }

  async addItemAddByRSSToPlaylistFirst(
    playlist_id_text: string,
    add_by_rss_resource_data: object
  ): Promise<PlaylistResource> {
    return this.addItemAddByRSSToPlaylistHelper(
      playlist_id_text,
      add_by_rss_resource_data,
      (firstItem) => {
        const newPosition = firstItem
          ? parseFloat(firstItem.list_position) - PLAYLIST_LIST_POSITION_INCREMENT
          : 1;
        return newPosition < 0 ? '0' : newPosition.toString();
      }
    );
  }

  async addItemAddByRSSToPlaylistLast(
    playlist_id_text: string,
    add_by_rss_resource_data: object
  ): Promise<PlaylistResource> {
    return this.addItemAddByRSSToPlaylistHelper(
      playlist_id_text,
      add_by_rss_resource_data,
      (_, lastItem) => {
        return lastItem
          ? (parseFloat(lastItem.list_position) + PLAYLIST_LIST_POSITION_INCREMENT).toString()
          : '1';
      }
    );
  }

  async addItemAddByRSSToPlaylistBetween(
    playlist_id_text: string,
    add_by_rss_resource_data: object,
    position1: number,
    position2: number
  ): Promise<PlaylistResource> {
    if (position1 === undefined || position2 === undefined) {
      throw new Error('Both position1 and position2 must be provided.');
    }

    if (position1 >= position2) {
      throw new Error('Position1 should be less than Position2.');
    }

    return this.addItemAddByRSSToPlaylistHelper(playlist_id_text, add_by_rss_resource_data, () => {
      const pos1 = parseFloat(position1.toString());
      const pos2 = parseFloat(position2.toString());

      if (isNaN(pos1) || isNaN(pos2)) {
        throw new Error('Invalid positions provided.');
      }

      return ((pos1 + pos2) / 2).toString();
    });
  }

  async removeItemAddByRSSFromPlaylist(
    playlist_id_text: string,
    add_by_rss_hash_id: string
  ): Promise<void> {
    const playlist = await this.playlistService.getByIdText(playlist_id_text);
    if (!playlist) {
      throw new Error('Playlist not found.');
    }

    const results = await this._delete(playlist, { add_by_rss_hash_id });

    await this.playlistService.updateLastUpdatedAndItemCount(playlist.id_text);

    return results;
  }
}
