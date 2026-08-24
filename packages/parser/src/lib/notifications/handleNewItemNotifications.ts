import { loggerService } from '@parser/factories/loggerService.js';
import type { HandleParsedItemsResult } from '@parser/lib/rss/item/item.js';

import {
  AccountNotificationTypeEnum,
  MediumEnum,
  NotificationCategoryEnum,
} from '@podverse/helpers';
import type { NotificationMessageType } from '@podverse/notifications';
import type { Channel, ChannelImage } from '@podverse/orm';
import { ItemService } from '@podverse/orm';

import type { ItemNotificationData } from './sharedNotificationHelpers.js';
import {
  createInAppNotificationsForAccounts,
  getBestImageUrl,
  getDevicesForNotificationType,
  getInAppNotificationLinkPath,
  getInAppNotificationTitle,
  groupDevicesByLocaleAndPlatform,
  loadChannelImages,
  sendItemNotifications,
} from './sharedNotificationHelpers.js';

/**
 * Determines the NotificationMessageType based on the channel's medium_id
 */
function getMessageTypeFromMedium(medium_id: number): NotificationMessageType {
  switch (medium_id) {
    case MediumEnum.Podcast:
      return 'new-episode';
    case MediumEnum.PodcastL:
      return 'new-episode';
    case MediumEnum.PublisherPodcast:
      return 'new-podcast';
    case MediumEnum.Video:
      return 'new-video';
    case MediumEnum.VideoL:
      return 'new-video';
    case MediumEnum.PublisherVideo:
      return 'new-video-channel';
    case MediumEnum.Music:
      return 'new-track';
    case MediumEnum.MusicL:
      return 'new-track';
    case MediumEnum.PublisherMusic:
      return 'new-album';
    default:
      return 'new';
  }
}

/**
 * Handles sending push notifications for new items parsed from RSS feeds
 */
export async function handleNewItemNotifications(
  channel: Channel,
  parsedItemsResult: HandleParsedItemsResult
): Promise<void> {
  try {
    const { newItemGuids, newItemGuidEnclosureUrls } = parsedItemsResult;

    // Early return if no new items
    if (newItemGuids.length === 0 && newItemGuidEnclosureUrls.length === 0) {
      return;
    }

    // Get devices for accounts that have new-item notifications enabled
    const devicesResult = await getDevicesForNotificationType(
      channel.id_text,
      AccountNotificationTypeEnum.NewItem,
      NotificationCategoryEnum.NewContent
    );

    if (!devicesResult) {
      return;
    }

    const {
      devices: allDevices,
      inAppEnabledAccountIds,
      webPushSubscriptions,
      upSubscriptions,
    } = devicesResult;

    // Get the items to send notifications for using batch queries
    const itemService = new ItemService();
    const items = [];

    // Get items by guids in batch
    if (newItemGuids.length > 0) {
      const itemsByGuid = await itemService.getManyByGuid(channel, newItemGuids, {
        relations: { item_images: true },
      });
      items.push(...itemsByGuid);
    }

    // Get items by guid_enclosure_urls in batch
    if (newItemGuidEnclosureUrls.length > 0) {
      const itemsByEnclosureUrl = await itemService.getManyByGuidEnclosureUrl(
        channel,
        newItemGuidEnclosureUrls,
        {
          relations: { item_images: true },
        }
      );
      items.push(...itemsByEnclosureUrl);
    }

    // Early return if no items found
    if (items.length === 0) {
      return;
    }

    // Sort items by pub_date descending and limit to 3 most recent
    const sortedItems = [...items]
      .sort((a, b) => {
        const dateA = a.pub_date ? new Date(a.pub_date).getTime() : 0;
        const dateB = b.pub_date ? new Date(b.pub_date).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 3);

    // Load channel images if not already loaded
    const channelImages: ChannelImage[] = await loadChannelImages(channel);

    // Determine the message type based on channel medium
    const messageType = getMessageTypeFromMedium(channel.medium_id);

    // Prepare notification data for each item (limited to 3 most recent)
    const itemNotifications: ItemNotificationData[] = sortedItems.map((item) => ({
      itemTitle: item.title || '',
      channelTitle: channel.title || '',
      imageUrl: getBestImageUrl(item, channelImages),
      itemIdText: item.id_text,
      channelIdText: channel.id_text,
      messageType,
      mediumId: channel.medium_id,
    }));

    for (const itemNotification of itemNotifications) {
      await createInAppNotificationsForAccounts({
        accountIds: inAppEnabledAccountIds,
        body: itemNotification.channelTitle,
        category: NotificationCategoryEnum.NewContent,
        linkPath: getInAppNotificationLinkPath(itemNotification),
        payload: {
          channelIdText: itemNotification.channelIdText,
          itemIdText: itemNotification.itemIdText,
          type: itemNotification.messageType,
        },
        title: getInAppNotificationTitle(itemNotification.messageType, itemNotification.itemTitle),
      });
    }

    // Group devices by locale and platform
    const groupedDevices = groupDevicesByLocaleAndPlatform(allDevices);

    // Send notifications
    await sendItemNotifications(
      itemNotifications,
      groupedDevices,
      webPushSubscriptions,
      upSubscriptions
    );
  } catch (error) {
    loggerService.logError('handleNewItemNotifications', error as Error);
    loggerService.logError(
      `handleNewItemNotifications: Error details - Channel: ${channel.id_text}, Error: ${(error as Error).message}`,
      error as Error
    );
  }
}
