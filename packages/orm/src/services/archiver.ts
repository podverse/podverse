import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db/index.js';
import { Clip } from '@orm/entities/clip.js';
import { Feed } from '@orm/entities/feed/feed.js';
import { FeedConditionTypeKeyEnum } from '@orm/entities/feed/feedConditionType.js';
import { FeedLifecycleStateKeyEnum } from '@orm/entities/feed/feedLifecycleStateType.js';
import { FeedLifecycleUpdateSourceEnum } from '@orm/entities/feed/feedLifecycleUpdateSource.js';
import { Item } from '@orm/entities/item/item.js';
import type { ItemFlagStatus } from '@orm/entities/item/itemFlagStatus.js';
import { ItemFlagStatusStatusEnum } from '@orm/entities/item/itemFlagStatus.js';
import { PlaylistResource } from '@orm/entities/playlist/playlistResource.js';
import { loggerService } from '@orm/factories/loggerService.js';
import type { FindOptionsRelations } from 'typeorm';

import { recordTakenDownContentLog } from './accountContentLog.js';
import { deleteEmptyRemovedShows } from './archivedChannelCleanup.js';
import type { FeedProbe } from './archivedFollowConversion.js';
import {
  convertArchivedShowFollows,
  endSettledDirectoryFollows,
} from './archivedFollowConversion.js';
import { slimArchivedChannels, slimArchivedItems } from './archivedSlimming.js';
import { FeedService } from './feed/feed.js';
import { ItemFlagStatusService } from './item/itemFlagStatus.js';
import { pruneNonActiveItemBackedQueueResourceRows } from './queue/queueResourceActiveItemFilter.js';
import { captureRemovedReferences } from './removedReferences.js';

const ARCHIVED_ITEM_ORPHAN_DELETE_BATCH_SIZE = 1000;
const PENDING_ARCHIVE_MAX_FEEDS_PER_RUN = 1000;
const PENDING_ARCHIVE_ITEM_CHUNK = 1000;

/**
 * True when a row still points at the item: a clip, a playlist row on the item or one of its
 * soundbites, or a channel merge map. Merge maps keep old item URLs redirecting, and their
 * item foreign keys have no ON DELETE, so a mapped item is archived rather than deleted.
 */
export function itemRetainedByReferenceSql(itemRef: string): string {
  return `(
    EXISTS (SELECT 1 FROM clip WHERE clip.item_id = ${itemRef})
    OR EXISTS (SELECT 1 FROM playlist_resource WHERE playlist_resource.item_id = ${itemRef})
    OR EXISTS (
      SELECT 1 FROM playlist_resource
      INNER JOIN item_soundbite ON item_soundbite.id = playlist_resource.item_soundbite_id
      WHERE item_soundbite.item_id = ${itemRef}
    )
    OR EXISTS (
      SELECT 1 FROM item_merge_map
      WHERE item_merge_map.from_item_id = ${itemRef} OR item_merge_map.to_item_id = ${itemRef}
    )
  )`;
}

export type ChannelDeleteQuery = {
  sql: string;
  params: (channelId: number) => unknown[];
};

export type ChannelDetailDeleteQuery = ChannelDeleteQuery & {
  table: string;
  byteFrom: string;
};

const CHANNEL_OWNED_DETAIL_TABLES = [
  'channel_trailer',
  'channel_season',
  'channel_category',
  'channel_chat',
  'channel_funding',
  'channel_internal_settings',
  'channel_license',
  'channel_location',
  'channel_meta_boost',
  'channel_person',
  'channel_podroll',
  'channel_publisher',
  'channel_remote_item',
  'channel_social_interact',
  'channel_txt',
  'channel_value',
] as const;

type ChannelOwnedDetailTable = (typeof CHANNEL_OWNED_DETAIL_TABLES)[number];

function deleteOwnedChannelRows(table: ChannelOwnedDetailTable): ChannelDetailDeleteQuery {
  return {
    table,
    sql: `DELETE FROM ${table} WHERE channel_id = $1`,
    params: (channelId) => [channelId],
    byteFrom: `${table} t INNER JOIN channel c ON c.id = t.channel_id`,
  };
}

function deleteChannelIdentityRows(
  table: 'channel_about' | 'channel_description' | 'channel_image'
): ChannelDeleteQuery {
  return {
    sql: `DELETE FROM ${table} WHERE channel_id = $1`,
    params: (channelId) => [channelId],
  };
}

/**
 * Related channel rows removed from an archived show. Trailers precede seasons because
 * channel_trailer.channel_season_id has no ON DELETE. Verified publisher links are removed
 * when the show is the content channel or the publisher channel.
 */
export const CHANNEL_DETAIL_DELETE_QUERIES: ChannelDetailDeleteQuery[] = [
  {
    table: 'channel_value_recipient',
    sql: `DELETE FROM channel_value_recipient
            WHERE channel_value_id IN (
              SELECT id FROM channel_value WHERE channel_id = $1
            )`,
    params: (channelId) => [channelId],
    byteFrom: `channel_value_recipient t
            INNER JOIN channel_value parent ON parent.id = t.channel_value_id
            INNER JOIN channel c ON c.id = parent.channel_id`,
  },
  {
    table: 'channel_podroll_remote_item',
    sql: `DELETE FROM channel_podroll_remote_item
            WHERE channel_podroll_id IN (
              SELECT id FROM channel_podroll WHERE channel_id = $1
            )`,
    params: (channelId) => [channelId],
    byteFrom: `channel_podroll_remote_item t
            INNER JOIN channel_podroll parent ON parent.id = t.channel_podroll_id
            INNER JOIN channel c ON c.id = parent.channel_id`,
  },
  {
    table: 'channel_publisher_remote_item',
    sql: `DELETE FROM channel_publisher_remote_item
            WHERE channel_publisher_id IN (
              SELECT id FROM channel_publisher WHERE channel_id = $1
            )`,
    params: (channelId) => [channelId],
    byteFrom: `channel_publisher_remote_item t
            INNER JOIN channel_publisher parent ON parent.id = t.channel_publisher_id
            INNER JOIN channel c ON c.id = parent.channel_id`,
  },
  {
    table: 'channel_verified_publisher',
    sql: `DELETE FROM channel_verified_publisher
            WHERE channel_id = $1 OR publisher_channel_id = $1`,
    params: (channelId) => [channelId],
    byteFrom: `channel_verified_publisher t INNER JOIN channel c ON c.id = t.channel_id`,
  },
  ...CHANNEL_OWNED_DETAIL_TABLES.map((table) => deleteOwnedChannelRows(table)),
];

/** Channel rows a takedown removes and an archived show keeps. */
export const CHANNEL_IDENTITY_DELETE_QUERIES: ChannelDeleteQuery[] = [
  deleteChannelIdentityRows('channel_about'),
  deleteChannelIdentityRows('channel_description'),
  deleteChannelIdentityRows('channel_image'),
];

export const FEED_RELATIONS_PENDING_OR_SPAM: FindOptionsRelations<Feed> = {
  feed_lifecycle_state: { feed_lifecycle_state_type: true },
  channel: { items: true },
};

export class ArchiverService {
  private itemRepositoryRead = AppDataSourceRead.getRepository(Item);
  private itemRepositoryReadWrite = AppDataSourceReadWrite.getRepository(Item);
  private feedRepositoryRead = AppDataSourceRead.getRepository(Feed);
  private playlistResourceRepository = AppDataSourceRead.getRepository(PlaylistResource);
  private clipRepository = AppDataSourceRead.getRepository(Clip);

  async getItemsPendingArchive(): Promise<Item[]> {
    return this.itemRepositoryRead.find({
      where: [
        {
          item_flag_status: {
            id: ItemFlagStatusStatusEnum.PendingArchive,
          },
        },
        {
          channel: {
            feed: {
              feed_lifecycle_state: {
                feed_lifecycle_state_type: {
                  state_key: FeedLifecycleStateKeyEnum.PendingArchive,
                },
              },
            },
          },
        },
      ],
      relations: {
        channel: {
          feed: {
            feed_lifecycle_state: {
              feed_lifecycle_state_type: true,
            },
          },
        },

        item_flag_status: true,
      },
    });
  }

  /**
   * Spam feeds: lifecycle **`active`**, **`spam_detected`** active, **`spam_permitted`** inactive.
   * Feeds with only `Archived` items are omitted so `archiveAll` does not scan them every run.
   */
  async getSpamFeedsWithActiveOrPendingItems(): Promise<Feed[]> {
    return this.feedRepositoryRead
      .createQueryBuilder('feed')
      .distinct(true)
      .innerJoinAndSelect('feed.channel', 'channel')
      .innerJoin('feed.feed_lifecycle_state', 'fls')
      .innerJoin('fls.feed_lifecycle_state_type', 'flst')
      .innerJoin('channel.items', 'item')
      .where('flst.state_key = :activeKey', { activeKey: FeedLifecycleStateKeyEnum.Active })
      .andWhere(
        `EXISTS (
          SELECT 1 FROM feed_condition fc
          INNER JOIN feed_condition_type fct ON fct.id = fc.feed_condition_type_id
          WHERE fc.feed_id = feed.id AND fc.is_active = true AND fct.condition_key = :spamDetected
        )`,
        { spamDetected: FeedConditionTypeKeyEnum.SpamDetected }
      )
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM feed_condition fc2
          INNER JOIN feed_condition_type fct2 ON fct2.id = fc2.feed_condition_type_id
          WHERE fc2.feed_id = feed.id AND fc2.is_active = true AND fct2.condition_key = :spamPermitted
        )`,
        { spamPermitted: FeedConditionTypeKeyEnum.SpamPermitted }
      )
      .andWhere('item.item_flag_status_id IN (:...cleanupItemStatusIds)', {
        cleanupItemStatusIds: [
          ItemFlagStatusStatusEnum.Active,
          ItemFlagStatusStatusEnum.PendingArchive,
        ],
      })
      .getMany();
  }

  private async processItems(items: Item[], archivedStatus: ItemFlagStatus): Promise<void> {
    for (const item of items) {
      const hasPlaylistResource =
        !!(await this.playlistResourceRepository.findOne({
          where: { item: { id: item.id } },
        })) ||
        !!(await this.playlistResourceRepository.findOne({
          where: { item_soundbite: { item: { id: item.id } } },
        }));

      const hasClip = !!(await this.clipRepository.findOne({
        where: { item: { id: item.id } },
      }));

      const mergeMapRows: unknown = await this.itemRepositoryReadWrite.query(
        `SELECT 1 FROM item_merge_map WHERE from_item_id = $1 OR to_item_id = $1 LIMIT 1`,
        [item.id]
      );
      const hasMergeMap = Array.isArray(mergeMapRows) && mergeMapRows.length > 0;

      if (hasPlaylistResource || hasClip || hasMergeMap) {
        item.item_flag_status = archivedStatus;
        await this.itemRepositoryReadWrite.save(item);
      } else {
        await this.itemRepositoryReadWrite.delete(item.id);
      }
    }
  }

  /**
   * Removes `Archived` items that no row points at (`itemRetainedByReferenceSql`). Deleting an
   * item that a playlist row points at, directly or through a soundbite, would null that row's
   * only reference, which the playlist_resource CHECK rejects.
   * Retention at archive time (`processItems`) keeps items only for those relationships; this pass
   * drops archived rows after users remove clips or playlists.
   */
  async deleteArchivedItemsWithoutClipOrPlaylist(): Promise<void> {
    const archivedId = ItemFlagStatusStatusEnum.Archived;

    for (;;) {
      const rows = (await this.itemRepositoryReadWrite.query(
        `SELECT i.id AS id FROM item i
         WHERE i.item_flag_status_id = $1
           AND NOT ${itemRetainedByReferenceSql('i.id')}
         LIMIT $2`,
        [archivedId, ARCHIVED_ITEM_ORPHAN_DELETE_BATCH_SIZE]
      )) as { id: number }[];

      if (rows.length === 0) {
        return;
      }

      const ids = rows.map((row) => row.id);
      await this.itemRepositoryReadWrite.delete(ids);

      if (rows.length < ARCHIVED_ITEM_ORPHAN_DELETE_BATCH_SIZE) {
        return;
      }
    }
  }

  /**
   * Archives at most `PENDING_ARCHIVE_MAX_FEEDS_PER_RUN` feeds in `pending_archive` that have a
   * channel. An item with a clip, a playlist row, or a playlist row on one of its soundbites
   * becomes Archived. Other active or pending items are deleted. A feed with no items still
   * becomes archived.
   */
  async processPendingArchiveFeeds(): Promise<void> {
    const raw: unknown = await this.feedRepositoryRead
      .createQueryBuilder('feed')
      .innerJoin('feed.channel', 'channel')
      .innerJoin('feed.feed_lifecycle_state', 'lifecycle')
      .innerJoin('lifecycle.feed_lifecycle_state_type', 'lifecycle_type')
      .select('feed.id', 'feed_id')
      .addSelect('channel.id', 'channel_id')
      .where('lifecycle_type.state_key = :pendingArchive', {
        pendingArchive: FeedLifecycleStateKeyEnum.PendingArchive,
      })
      .orderBy('feed.id', 'ASC')
      .limit(PENDING_ARCHIVE_MAX_FEEDS_PER_RUN)
      .getRawMany();

    const selected = pendingArchiveTargets(raw).slice(0, PENDING_ARCHIVE_MAX_FEEDS_PER_RUN);

    if (selected.length === 0) {
      loggerService.info('Pending archive: feeds=0 items_archived=0 items_deleted=0');
      return;
    }

    const itemFlagStatusService = new ItemFlagStatusService();
    const archivedStatus = await itemFlagStatusService.get(ItemFlagStatusStatusEnum.Archived);

    if (!archivedStatus) {
      throw new Error('Archived item_flag_status not found');
    }

    let itemsArchived = 0;
    let itemsDeleted = 0;
    const channelIds = selected.map((row) => row.channelId);

    for (let offset = 0; offset < channelIds.length; offset += PENDING_ARCHIVE_ITEM_CHUNK) {
      const chunk = channelIds.slice(offset, offset + PENDING_ARCHIVE_ITEM_CHUNK);
      itemsArchived += await this.archiveItemsWithClipOrPlaylist(chunk, archivedStatus.id);
      itemsDeleted += await this.deleteActiveOrPendingItemsWithoutClipOrPlaylist(chunk);
    }

    const feedService = new FeedService();

    for (const row of selected) {
      await feedService.setFeedLifecycleState(row.feedId, {
        toStateKey: FeedLifecycleStateKeyEnum.Archived,
        source: FeedLifecycleUpdateSourceEnum.Archiver,
      });
      await feedService.update(row.feedId, { last_parsed_file_hash: null });
    }

    loggerService.info(
      `Pending archive: feeds=${selected.length} items_archived=${itemsArchived} items_deleted=${itemsDeleted}`
    );
  }

  /** Keeps the same retention as `processItems` (`itemRetainedByReferenceSql`). */
  private async archiveItemsWithClipOrPlaylist(
    channelIds: number[],
    archivedStatusId: number
  ): Promise<number> {
    const result: unknown = await this.itemRepositoryReadWrite.query(
      `UPDATE item
       SET item_flag_status_id = $1
       WHERE channel_id = ANY($2::int[])
         AND item_flag_status_id = ANY($3::int[])
         AND ${itemRetainedByReferenceSql('item.id')}`,
      [
        archivedStatusId,
        channelIds,
        [ItemFlagStatusStatusEnum.Active, ItemFlagStatusStatusEnum.PendingArchive],
      ]
    );
    return statementRowCount(result);
  }

  private async deleteActiveOrPendingItemsWithoutClipOrPlaylist(
    channelIds: number[]
  ): Promise<number> {
    let deleted = 0;

    for (;;) {
      const result: unknown = await this.itemRepositoryReadWrite.query(
        `SELECT i.id AS id FROM item i
         WHERE i.channel_id = ANY($1::int[])
           AND i.item_flag_status_id = ANY($2::int[])
           AND NOT ${itemRetainedByReferenceSql('i.id')}
         LIMIT $3`,
        [
          channelIds,
          [ItemFlagStatusStatusEnum.Active, ItemFlagStatusStatusEnum.PendingArchive],
          PENDING_ARCHIVE_ITEM_CHUNK,
        ]
      );
      const ids = integerColumn(result, 'id');

      if (ids.length === 0) {
        return deleted;
      }

      await this.itemRepositoryReadWrite.delete(ids);
      deleted += ids.length;

      if (ids.length < PENDING_ARCHIVE_ITEM_CHUNK) {
        return deleted;
      }
    }
  }

  /**
   * Applies the same clip/playlist retention as pending-archive feed processing; feed lifecycle stays
   * **`active`** with spam conditions (does not move the feed to **`archived`**).
   */
  async processSpamFeeds(): Promise<void> {
    const feeds = await this.getSpamFeedsWithActiveOrPendingItems();
    const itemFlagStatusService = new ItemFlagStatusService();
    const archivedStatus = await itemFlagStatusService.get(ItemFlagStatusStatusEnum.Archived);

    if (!archivedStatus) {
      throw new Error('Archived item_flag_status not found');
    }

    for (const feed of feeds) {
      const channel = feed.channel;

      if (!channel) {
        continue;
      }

      const items = await this.itemRepositoryRead.find({
        where: {
          channel: feed.channel,
        },
        relations: {
          item_flag_status: true,
        },
      });

      if (items.length > 0) {
        const activeOrPendingItems = items.filter((item) =>
          [ItemFlagStatusStatusEnum.Active, ItemFlagStatusStatusEnum.PendingArchive].includes(
            item.item_flag_status.id
          )
        );
        await this.processItems(activeOrPendingItems, archivedStatus);
      }
    }
  }

  async processPendingArchiveItems(): Promise<void> {
    const items = await this.getItemsPendingArchive();
    const itemFlagStatusService = new ItemFlagStatusService();
    const archivedStatus = await itemFlagStatusService.get(ItemFlagStatusStatusEnum.Archived);

    if (!archivedStatus) {
      throw new Error('Archived item_flag_status not found');
    }

    await this.processItems(items, archivedStatus);
  }

  async getFeedsWithTakedownStatus(): Promise<Feed[]> {
    return this.feedRepositoryRead.find({
      where: {
        feed_lifecycle_state: {
          feed_lifecycle_state_type: {
            state_key: FeedLifecycleStateKeyEnum.Takedown,
          },
        },
      },
      relations: FEED_RELATIONS_PENDING_OR_SPAM,
    });
  }

  /**
   * One transaction per feed. Snapshots are written before the episodes go. The Removed
   * Content rows and directory follows are written next. item_merge_map rows are removed
   * before the items because those item foreign keys have no ON DELETE.
   */
  async removeAllItemsForTakedownFeeds(): Promise<void> {
    const feeds = await this.getFeedsWithTakedownStatus();
    const queries = [...CHANNEL_DETAIL_DELETE_QUERIES, ...CHANNEL_IDENTITY_DELETE_QUERIES];

    for (const feed of feeds) {
      const channel = feed.channel;
      if (!channel) {
        continue;
      }

      const itemIds = channel.items?.map((item) => item.id) ?? [];

      const captured = await AppDataSourceReadWrite.transaction(async (manager) => {
        const counts = await captureRemovedReferences(itemIds, manager);
        await recordTakenDownContentLog(manager, {
          channelId: channel.id,
          channelIdText: channel.id_text,
          channelTitle: channel.title,
          itemIds,
        });

        if (itemIds.length > 0) {
          await manager.query(
            `DELETE FROM item_merge_map WHERE from_item_id = ANY($1::int[]) OR to_item_id = ANY($1::int[])`,
            [itemIds]
          );
          await manager.delete(Item, itemIds);
        }

        for (const query of queries) {
          await manager.query(query.sql, query.params(channel.id));
        }

        return counts;
      });

      loggerService.info(
        `Takedown removed feed=${feed.id} items=${itemIds.length} clips_kept=${captured.clips} playlist_entries_kept=${captured.playlistEntries}`
      );
    }
  }

  async archiveAll(options: { feedProbe: FeedProbe }): Promise<void> {
    await this.processPendingArchiveFeeds();
    await this.processSpamFeeds();
    await this.processPendingArchiveItems();
    await this.deleteArchivedItemsWithoutClipOrPlaylist();
    const items = await slimArchivedItems();
    const channels = await slimArchivedChannels();
    loggerService.info(
      `Archived content slimmed: items=${items.slimmed} channels=${channels.slimmed}`
    );
    const follows = await convertArchivedShowFollows(options.feedProbe);
    const settled = await endSettledDirectoryFollows();
    loggerService.info(
      `Archived follow conversion: converted=${follows.converted} follows_moved=${follows.followsMoved} unreachable=${follows.unreachable} skipped=${follows.skipped}`
    );
    loggerService.info(`Settled directory follows ended: count=${settled.ended}`);
    await this.removeAllItemsForTakedownFeeds();
    const removed = await deleteEmptyRemovedShows();
    loggerService.info(`Empty removed shows deleted: count=${removed.deleted}`);
    await pruneNonActiveItemBackedQueueResourceRows();
  }
}

function pendingArchiveTargets(result: unknown): { feedId: number; channelId: number }[] {
  if (!Array.isArray(result)) {
    return [];
  }

  const targets: { feedId: number; channelId: number }[] = [];

  for (const row of result) {
    if (typeof row !== 'object' || row === null) {
      continue;
    }

    const feedId = finiteInteger(Reflect.get(row, 'feed_id'));
    const channelId = finiteInteger(Reflect.get(row, 'channel_id'));

    if (feedId === null || channelId === null) {
      continue;
    }

    targets.push({ feedId, channelId });
  }

  return targets;
}

function integerColumn(result: unknown, key: string): number[] {
  if (!Array.isArray(result)) {
    return [];
  }

  const values: number[] = [];

  for (const row of result) {
    if (typeof row !== 'object' || row === null) {
      continue;
    }

    const parsed = finiteInteger(Reflect.get(row, key));

    if (parsed !== null) {
      values.push(parsed);
    }
  }

  return values;
}

function statementRowCount(result: unknown): number {
  if (Array.isArray(result)) {
    const count = result[1];

    if (typeof count === 'number' && Number.isFinite(count)) {
      return count;
    }
  }

  if (typeof result === 'object' && result !== null) {
    const rowCount = Reflect.get(result, 'rowCount');

    if (typeof rowCount === 'number' && Number.isFinite(rowCount)) {
      return rowCount;
    }
  }

  return 0;
}

function finiteInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    const parsed = Number(value);

    if (Number.isSafeInteger(parsed)) {
      return parsed;
    }
  }

  return null;
}
