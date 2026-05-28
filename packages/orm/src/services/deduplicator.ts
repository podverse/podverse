import { AppDataSourceReadWrite } from '@orm/db/index.js';
import { AccountFollowingChannel } from '@orm/entities/account/accountFollowingChannel.js';
import { Clip } from '@orm/entities/clip.js';
import { Item } from '@orm/entities/item/item.js';
import { PlaylistResource } from '@orm/entities/playlist/playlistResource.js';
import {
  buildItemMapsForDedup,
  findDuplicateItemForDedup,
} from '@orm/services/deduplicator.helpers.js';
import type { EntityManager } from 'typeorm';

export class DeduplicatorService {
  protected readWriteEntityManager: EntityManager;

  constructor() {
    this.readWriteEntityManager = AppDataSourceReadWrite.manager;
  }

  async mergeChannels(id_to_archive: number, duplicate_id_to_keep: number): Promise<void> {
    await this.updateAccountFollowingChannel(id_to_archive, duplicate_id_to_keep);

    const { itemsToArchive, duplicateItemsToKeep } = await this.getItemsForBothChannels(
      id_to_archive,
      duplicate_id_to_keep
    );
    const { guidMap, guidEnclosureUrlMap } = this.buildItemMaps(duplicateItemsToKeep);

    for (const itemToArchive of itemsToArchive) {
      const duplicateItemToKeep = this.findDuplicateItem(
        itemToArchive,
        guidMap,
        guidEnclosureUrlMap
      );
      if (duplicateItemToKeep) {
        await this.updateClipAndPlaylistResource(itemToArchive.id, duplicateItemToKeep.id);
      }
    }
  }

  private async updateAccountFollowingChannel(
    id_to_archive: number,
    duplicate_id_to_keep: number
  ): Promise<void> {
    await this.readWriteEntityManager
      .createQueryBuilder()
      .update(AccountFollowingChannel)
      .set({ channel_id: duplicate_id_to_keep })
      .where('channel_id = :id_to_archive', { id_to_archive })
      .execute();
  }

  private buildItemMaps(items: Item[]): {
    guidMap: Map<string, Item>;
    guidEnclosureUrlMap: Map<string, Item>;
  } {
    return buildItemMapsForDedup(items);
  }

  private findDuplicateItem(
    itemToArchive: Item,
    guidMap: Map<string, Item>,
    guidEnclosureUrlMap: Map<string, Item>
  ): Item | undefined {
    return findDuplicateItemForDedup(itemToArchive, guidMap, guidEnclosureUrlMap);
  }

  private async updateClipAndPlaylistResource(
    itemToArchiveId: number,
    duplicateItemToKeepId: number
  ): Promise<void> {
    const duplicateItemId = String(duplicateItemToKeepId);
    const archivedItemId = String(itemToArchiveId);

    await this.readWriteEntityManager
      .createQueryBuilder()
      .update(Clip)
      .set({ item_id: duplicateItemId })
      .where('item_id = :itemToArchiveId', { itemToArchiveId: archivedItemId })
      .execute();

    await this.readWriteEntityManager
      .createQueryBuilder()
      .update(PlaylistResource)
      .set({ item_id: duplicateItemId })
      .where('item_id = :itemToArchiveId', { itemToArchiveId: archivedItemId })
      .execute();
  }

  async getChannelItems(channel_id: number): Promise<Item[]> {
    const items = await this.readWriteEntityManager
      .getRepository(Item)
      .find({ where: { channel: { id: channel_id } } });
    return items;
  }

  async getItemsForBothChannels(
    id_to_archive: number,
    duplicate_id_to_keep: number
  ): Promise<{ itemsToArchive: Item[]; duplicateItemsToKeep: Item[] }> {
    const itemsToArchive = await this.getChannelItems(id_to_archive);
    const duplicateItemsToKeep = await this.getChannelItems(duplicate_id_to_keep);
    return { itemsToArchive, duplicateItemsToKeep };
  }
}
