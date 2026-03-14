import { loggerService } from '@parser/factories/loggerService.js';
import type { HandleParsedLiveItemsResult } from '@parser/lib/rss/liveItem/liveItem.js';

import { AccountNotificationTypeEnum } from '@podverse/helpers';
import type { NotificationMessageType } from '@podverse/notifications';
import type { Channel, ChannelImage } from '@podverse/orm';
import { ItemService } from '@podverse/orm';

import type { ItemNotificationData } from './sharedNotificationHelpers.js';
import {
  getBestImageUrl,
  getDevicesForNotificationType,
  groupDevicesByLocaleAndPlatform,
  loadChannelImages,
  sendItemNotifications,
} from './sharedNotificationHelpers.js';

/**
 * Handles sending push notifications for live items
 * - "livestream-scheduled" notifications for pending live items
 * - "livestream-started" notifications for live items that have started
 */
export async function handleNewLiveItemNotifications(
  channel: Channel,
  parsedLiveItemsResult: HandleParsedLiveItemsResult
): Promise<void> {
  try {
    const { pendingItemGuids, liveItemGuids } = parsedLiveItemsResult;

    // Early return if no live items to notify about
    if (pendingItemGuids.length === 0 && liveItemGuids.length === 0) {
      return;
    }

    // Load channel images once for all notifications
    const channelImages: ChannelImage[] = await loadChannelImages(channel);

    // Handle pending (scheduled) notifications
    if (pendingItemGuids.length > 0) {
      await sendLiveItemNotificationsForStatus(
        channel,
        pendingItemGuids,
        channelImages,
        'livestream-scheduled',
        AccountNotificationTypeEnum.LivestreamScheduled
      );
    }

    // Handle live (started) notifications
    if (liveItemGuids.length > 0) {
      await sendLiveItemNotificationsForStatus(
        channel,
        liveItemGuids,
        channelImages,
        'livestream-started',
        AccountNotificationTypeEnum.LivestreamStarting
      );
    }
  } catch (error) {
    loggerService.logError('handleNewLiveItemNotifications', error as Error);
  }
}

/**
 * Sends notifications for live items with a specific status
 */
async function sendLiveItemNotificationsForStatus(
  channel: Channel,
  itemGuids: string[],
  channelImages: ChannelImage[],
  messageType: NotificationMessageType,
  notificationType: AccountNotificationTypeEnum
): Promise<void> {
  // Get devices for accounts that have this notification type enabled
  const devicesResult = await getDevicesForNotificationType(channel.id_text, notificationType);

  if (!devicesResult) {
    return;
  }

  const { devices: allDevices, webPushSubscriptions, upSubscriptions } = devicesResult;

  // Get the items to send notifications for using batch queries
  const itemService = new ItemService();
  const items = await itemService.getManyByGuid(channel, itemGuids, {
    relations: { item_images: true, live_item: true },
  });

  // Early return if no items found
  if (items.length === 0) {
    return;
  }

  // Sort items by start_time (for live items) or pub_date descending and limit to 3 most recent
  const sortedItems = [...items]
    .sort((a, b) => {
      // Use live_item start_time if available, otherwise fall back to pub_date
      const dateA = a.live_item?.start_time
        ? new Date(a.live_item.start_time).getTime()
        : a.pub_date
          ? new Date(a.pub_date).getTime()
          : 0;
      const dateB = b.live_item?.start_time
        ? new Date(b.live_item.start_time).getTime()
        : b.pub_date
          ? new Date(b.pub_date).getTime()
          : 0;
      return dateB - dateA;
    })
    .slice(0, 3);

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

  // Group devices by locale and platform
  const groupedDevices = groupDevicesByLocaleAndPlatform(allDevices);

  // Send notifications
  await sendItemNotifications(
    itemNotifications,
    groupedDevices,
    webPushSubscriptions,
    upSubscriptions
  );
}
