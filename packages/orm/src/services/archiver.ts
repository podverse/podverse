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

import { FeedService } from './feed/feed.js';
import { ItemFlagStatusService } from './item/itemFlagStatus.js';
import { pruneNonActiveItemBackedQueueResourceRows } from './queue/queueResourceActiveItemFilter.js';

const ARCHIVED_ITEM_ORPHAN_DELETE_BATCH_SIZE = 1000;

const FEED_RELATIONS_PENDING_OR_SPAM = [
  'feed_lifecycle_state',
  'feed_lifecycle_state.feed_lifecycle_state_type',
  'channel',
  'channel.items',
] as const;

export class ArchiverService {
  private itemRepositoryRead = AppDataSourceRead.getRepository(Item);
  private itemRepositoryReadWrite = AppDataSourceReadWrite.getRepository(Item);
  private feedRepositoryRead = AppDataSourceRead.getRepository(Feed);
  private feedRepositoryReadWrite = AppDataSourceReadWrite.getRepository(Feed);
  private playlistResourceRepository = AppDataSourceRead.getRepository(PlaylistResource);
  private clipRepository = AppDataSourceRead.getRepository(Clip);

  private optionalChannelDeleteQueries: {
    sql: string;
    params: (channelId: number) => unknown[];
  }[] = [
    {
      sql: `DELETE FROM channel_value_recipient
            WHERE channel_value_id IN (
              SELECT id FROM channel_value WHERE channel_id = $1
            )`,
      params: (channelId) => [channelId],
    },
    {
      sql: `DELETE FROM channel_podroll_remote_item
            WHERE channel_podroll_id IN (
              SELECT id FROM channel_podroll WHERE channel_id = $1
            )`,
      params: (channelId) => [channelId],
    },
    {
      sql: `DELETE FROM channel_publisher_remote_item
            WHERE channel_publisher_id IN (
              SELECT id FROM channel_publisher WHERE channel_id = $1
            )`,
      params: (channelId) => [channelId],
    },
    { sql: 'DELETE FROM channel_about WHERE channel_id = $1', params: (channelId) => [channelId] },
    {
      sql: 'DELETE FROM channel_category WHERE channel_id = $1',
      params: (channelId) => [channelId],
    },
    { sql: 'DELETE FROM channel_chat WHERE channel_id = $1', params: (channelId) => [channelId] },
    {
      sql: 'DELETE FROM channel_description WHERE channel_id = $1',
      params: (channelId) => [channelId],
    },
    {
      sql: 'DELETE FROM channel_funding WHERE channel_id = $1',
      params: (channelId) => [channelId],
    },
    { sql: 'DELETE FROM channel_image WHERE channel_id = $1', params: (channelId) => [channelId] },
    {
      sql: 'DELETE FROM channel_internal_settings WHERE channel_id = $1',
      params: (channelId) => [channelId],
    },
    {
      sql: 'DELETE FROM channel_license WHERE channel_id = $1',
      params: (channelId) => [channelId],
    },
    {
      sql: 'DELETE FROM channel_location WHERE channel_id = $1',
      params: (channelId) => [channelId],
    },
    {
      sql: 'DELETE FROM channel_meta_boost WHERE channel_id = $1',
      params: (channelId) => [channelId],
    },
    { sql: 'DELETE FROM channel_person WHERE channel_id = $1', params: (channelId) => [channelId] },
    {
      sql: 'DELETE FROM channel_podroll WHERE channel_id = $1',
      params: (channelId) => [channelId],
    },
    {
      sql: 'DELETE FROM channel_publisher WHERE channel_id = $1',
      params: (channelId) => [channelId],
    },
    {
      sql: 'DELETE FROM channel_remote_item WHERE channel_id = $1',
      params: (channelId) => [channelId],
    },
    { sql: 'DELETE FROM channel_season WHERE channel_id = $1', params: (channelId) => [channelId] },
    {
      sql: 'DELETE FROM channel_social_interact WHERE channel_id = $1',
      params: (channelId) => [channelId],
    },
    {
      sql: 'DELETE FROM channel_trailer WHERE channel_id = $1',
      params: (channelId) => [channelId],
    },
    { sql: 'DELETE FROM channel_txt WHERE channel_id = $1', params: (channelId) => [channelId] },
    { sql: 'DELETE FROM channel_value WHERE channel_id = $1', params: (channelId) => [channelId] },
  ];

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
      relations: [
        'channel',
        'channel.feed',
        'channel.feed.feed_lifecycle_state',
        'channel.feed.feed_lifecycle_state.feed_lifecycle_state_type',
        'item_flag_status',
      ],
    });
  }

  async getFeedsPendingArchive(): Promise<Feed[]> {
    return this.feedRepositoryRead.find({
      where: {
        feed_lifecycle_state: {
          feed_lifecycle_state_type: {
            state_key: FeedLifecycleStateKeyEnum.PendingArchive,
          },
        },
      },
      relations: [...FEED_RELATIONS_PENDING_OR_SPAM],
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
      const hasPlaylistResource = !!(await this.playlistResourceRepository.findOne({
        where: { item: { id: item.id } },
      }));

      const hasClip = !!(await this.clipRepository.findOne({
        where: { item: { id: item.id } },
      }));

      if (hasPlaylistResource || hasClip) {
        item.item_flag_status = archivedStatus;
        await this.itemRepositoryReadWrite.save(item);
      } else {
        await this.itemRepositoryReadWrite.delete(item.id);
      }
    }
  }

  /**
   * Removes `Archived` items that no longer have `Clip` or `playlist_resource` rows.
   * Retention at archive time (`processItems`) keeps items only for those relationships; this second pass
   * drops stale archived rows after users remove clips/playlists.
   */
  async deleteArchivedItemsWithoutClipOrPlaylist(): Promise<void> {
    const archivedId = ItemFlagStatusStatusEnum.Archived;

    for (;;) {
      const rows = (await this.itemRepositoryReadWrite.query(
        `SELECT i.id AS id FROM item i
         WHERE i.item_flag_status_id = $1
           AND NOT EXISTS (SELECT 1 FROM clip c WHERE c.item_id = i.id)
           AND NOT EXISTS (SELECT 1 FROM playlist_resource pr WHERE pr.item_id = i.id)
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

  async processPendingArchiveFeeds(): Promise<void> {
    const feeds = await this.getFeedsPendingArchive();
    const itemFlagStatusService = new ItemFlagStatusService();
    const archivedStatus = await itemFlagStatusService.get(ItemFlagStatusStatusEnum.Archived);
    const feedService = new FeedService();

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
        relations: ['item_flag_status'],
      });

      if (items.length > 0) {
        const activeOrPendingItems = items.filter((item) =>
          [ItemFlagStatusStatusEnum.Active, ItemFlagStatusStatusEnum.PendingArchive].includes(
            item.item_flag_status.id
          )
        );
        await this.processItems(activeOrPendingItems, archivedStatus);
      }

      await feedService.setFeedLifecycleState(feed.id, {
        toStateKey: FeedLifecycleStateKeyEnum.Archived,
        source: FeedLifecycleUpdateSourceEnum.Archiver,
      });
      await feedService.update(feed.id, { last_parsed_file_hash: null });
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
        relations: ['item_flag_status'],
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
      relations: [...FEED_RELATIONS_PENDING_OR_SPAM],
    });
  }

  private async removeOptionalChannelRows(channelId: number): Promise<void> {
    for (const query of this.optionalChannelDeleteQueries) {
      await this.feedRepositoryReadWrite.query(query.sql, query.params(channelId));
    }
  }

  async removeAllItemsForTakedownFeeds(): Promise<void> {
    const feeds = await this.getFeedsWithTakedownStatus();
    for (const feed of feeds) {
      const channel = feed.channel;
      if (!channel) {
        continue;
      }

      const itemIds = channel.items?.map((item) => item.id) ?? [];
      if (itemIds.length > 0) {
        await this.itemRepositoryReadWrite.delete(itemIds);
      }

      await this.removeOptionalChannelRows(channel.id);
    }
  }

  async archiveAll(): Promise<void> {
    await this.processPendingArchiveFeeds();
    await this.processSpamFeeds();
    await this.processPendingArchiveItems();
    await this.deleteArchivedItemsWithoutClipOrPlaylist();
    await this.removeAllItemsForTakedownFeeds();
    await pruneNonActiveItemBackedQueueResourceRows();
  }
}
