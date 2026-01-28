import {
  AccountFCMDevicePlatformEnum,
  AccountNotificationTypeEnum,
  hasValidMembership,
} from '@podverse/helpers';
import {
  AccountFCMDeviceService,
  AccountNotificationChannelService,
  AccountNotificationChannelType,
  AccountWebPushDeviceService,
  AccountUPDeviceService,
  Channel,
  ChannelImage,
  ChannelService,
  Item,
} from '@podverse/orm';
import {
  NotificationMessageType,
  NotificationPlatform,
  notificationOrchestrator,
  WebPushSubscription,
  UPSubscription,
} from '@podverse/notifications';
import { loggerService } from '@parser/factories/loggerService';
import { config as projectConfig } from '@parser/config';
import { getNotificationsContext, getFirebaseContext } from '@parser/context';

/**
 * Gets the default locale from config, throwing if not configured.
 * This should never happen in production as the env var is validated at startup.
 */
const getDefaultLocale = (): string => {
  const locale = projectConfig.defaults.account.settings.locale;
  if (!locale) {
    throw new Error('DEFAULT_ACCOUNT_SETTINGS_LOCALE is not configured');
  }
  return locale;
};

export type DeviceWithLocale = {
  fcm_token: string;
  platform: NotificationPlatform;
  locale: string;
  account_id: number;
};

export type ItemNotificationData = {
  itemTitle: string;
  channelTitle: string;
  imageUrl: string | null;
  itemIdText: string;
  channelIdText: string;
  messageType: NotificationMessageType;
  mediumId: number; // For constructing medium-specific links (e.g., /podcast/livestream vs /music/livestream)
};

// Minimum acceptable image size for notifications (in pixels)
const NOTIFICATION_IMAGE_MIN_SIZE = 200;
// Ideal image size for notifications - not too large to waste bandwidth
const NOTIFICATION_IMAGE_IDEAL_SIZE = 512;

/**
 * Selects the best image from a list based on notification requirements.
 * Prefers images above minimum size, closest to ideal size.
 * Falls back to largest available if none meet minimum.
 */
export function selectBestImage<T extends { url: string; image_width_size?: number | null }>(
  images: T[]
): string | null {
  if (!images || images.length === 0) {
    return null;
  }

  // Filter images that meet the minimum size requirement
  const adequateImages = images.filter(
    (img) => (img.image_width_size || 0) >= NOTIFICATION_IMAGE_MIN_SIZE
  );

  if (adequateImages.length > 0) {
    // From adequate images, find the one closest to ideal size
    // Prefer slightly larger over slightly smaller
    const sortedByIdeal = [...adequateImages].sort((a, b) => {
      const diffA = Math.abs((a.image_width_size || 0) - NOTIFICATION_IMAGE_IDEAL_SIZE);
      const diffB = Math.abs((b.image_width_size || 0) - NOTIFICATION_IMAGE_IDEAL_SIZE);
      if (diffA === diffB) {
        // If equal distance from ideal, prefer the larger one
        return (b.image_width_size || 0) - (a.image_width_size || 0);
      }
      return diffA - diffB;
    });
    const bestIdeal = sortedByIdeal[0];
    return bestIdeal?.url ?? null;
  }

  // No images meet minimum size - fall back to largest available
  const sortedBySize = [...images].sort(
    (a, b) => (b.image_width_size || 0) - (a.image_width_size || 0)
  );
  const largest = sortedBySize[0];
  return largest?.url ?? null;
}

/**
 * Gets the best available image URL from item images or channel images
 */
export function getBestImageUrl(item: Item, channelImages: ChannelImage[]): string | null {
  // Try item images first
  if (item.item_images && item.item_images.length > 0) {
    const itemImageUrl = selectBestImage(item.item_images);
    if (itemImageUrl) {
      return itemImageUrl;
    }
  }

  // Fall back to channel images
  if (channelImages && channelImages.length > 0) {
    return selectBestImage(channelImages);
  }

  return null;
}

/**
 * Converts AccountFCMDevicePlatformEnum to NotificationPlatform
 */
export function convertPlatform(platform: AccountFCMDevicePlatformEnum): NotificationPlatform {
  switch (platform) {
    case AccountFCMDevicePlatformEnum.Web:
      return 'web';
    case AccountFCMDevicePlatformEnum.Android:
      return 'android';
    case AccountFCMDevicePlatformEnum.iOS:
      return 'ios';
    default:
      return 'web';
  }
}

/**
 * Groups devices by locale and platform for batch notification sending
 */
export function groupDevicesByLocaleAndPlatform(
  devices: DeviceWithLocale[]
): Map<string, Map<NotificationPlatform, string[]>> {
  const localeMap = new Map<string, Map<NotificationPlatform, string[]>>();

  for (const device of devices) {
    if (!localeMap.has(device.locale)) {
      localeMap.set(device.locale, new Map());
    }
    const platformMap = localeMap.get(device.locale) ?? new Map();

    if (!platformMap.has(device.platform)) {
      platformMap.set(device.platform, []);
    }
    (platformMap.get(device.platform) ?? []).push(device.fcm_token);
  }

  return localeMap;
}

/**
 * Loads channel images if not already present on the channel object
 */
export async function loadChannelImages(channel: Channel): Promise<ChannelImage[]> {
  if (channel.channel_images) {
    return channel.channel_images;
  }

  const channelService = new ChannelService();
  const channelWithImages = await channelService.getByIdText(channel.id_text, {
    channel_images: true,
  });
  return channelWithImages?.channel_images || [];
}

/**
 * Gets devices for accounts that have a specific notification type enabled for a channel
 */
export async function getDevicesForNotificationType(
  channelIdText: string,
  notificationType: AccountNotificationTypeEnum
): Promise<{
  devices: DeviceWithLocale[];
  webPushSubscriptions: Map<string, WebPushSubscription[]>;
  upSubscriptions: Map<string, UPSubscription[]>;
  accountLocaleMap: Map<number, string>;
} | null> {
  // Get all account notification channels for this channel with their types
  const accountNotificationChannelService = new AccountNotificationChannelService();
  const notificationChannels = await accountNotificationChannelService.getAllByChannelIdText(
    channelIdText,
    {
      relations: {
        account_notification_channel_types: true,
        account: {
          account_settings: {
            account_settings_locale: true,
          },
          account_membership_status: true,
        },
      },
    }
  );

  // Filter to only accounts that have the specified notification type enabled
  const accountIdsWithTypeEnabled: number[] = [];
  const accountLocaleMap = new Map<number, string>();

  for (const notificationChannel of notificationChannels) {
    const hasType = notificationChannel.account_notification_channel_types?.some(
      (type: AccountNotificationChannelType) => type.type === notificationType
    );

    if (hasType) {
      // Check if account has a valid, non-expired membership
      const membershipStatus = notificationChannel.account?.account_membership_status;

      if (hasValidMembership(membershipStatus)) {
        accountIdsWithTypeEnabled.push(notificationChannel.account_id);

        // Store the locale for each account
        const locale =
          notificationChannel.account?.account_settings?.account_settings_locale?.locale ||
          getDefaultLocale();
        accountLocaleMap.set(notificationChannel.account_id, locale);
      }
    }
  }

  // Early return if no accounts have this notification type enabled
  if (accountIdsWithTypeEnabled.length === 0) {
    return null;
  }

  // Get all FCM devices for the filtered account IDs in a single batch query
  const accountFCMDeviceService = new AccountFCMDeviceService();
  const deviceResults =
    await accountFCMDeviceService.getAllForAccountIds(accountIdsWithTypeEnabled);

  // Get all Web Push devices for the filtered account IDs in a single batch query
  const accountWebPushDeviceService = new AccountWebPushDeviceService();
  const webPushDeviceResults =
    await accountWebPushDeviceService.getAllForAccountIds(accountIdsWithTypeEnabled);

  // Get all Unified Push devices for the filtered account IDs in a single batch query
  const accountUPDeviceService = new AccountUPDeviceService();
  const upDeviceResults =
    await accountUPDeviceService.getAllForAccountIds(accountIdsWithTypeEnabled);

  // Early return if no devices to send to (FCM, Web Push, or UP)
  if (
    deviceResults.length === 0 &&
    webPushDeviceResults.length === 0 &&
    upDeviceResults.length === 0
  ) {
    return null;
  }

  // Map FCM devices to DeviceWithLocale format
  const devices: DeviceWithLocale[] = deviceResults.map((device) => ({
    fcm_token: device.fcm_token,
    platform: convertPlatform(device.platform),
    locale: device.locale || accountLocaleMap.get(device.account_id) || getDefaultLocale(),
    account_id: device.account_id,
  }));

  // Map Web Push devices to WebPushSubscription format, grouped by locale
  const webPushSubscriptions = new Map<string, WebPushSubscription[]>();
  for (const device of webPushDeviceResults) {
    const locale = device.locale || accountLocaleMap.get(device.account_id) || 'en-US';
    if (!webPushSubscriptions.has(locale)) {
      webPushSubscriptions.set(locale, []);
    }
    (webPushSubscriptions.get(locale) ?? []).push({
      endpoint: device.endpoint,
      keys: {
        p256dh: device.p256dh,
        auth: device.auth,
      },
    });
  }

  // Map UP devices to UPSubscription format, grouped by locale
  const upSubscriptions = new Map<string, UPSubscription[]>();
  for (const device of upDeviceResults) {
    const locale = device.locale || accountLocaleMap.get(device.account_id) || 'en-US';
    if (!upSubscriptions.has(locale)) {
      upSubscriptions.set(locale, []);
    }
    (upSubscriptions.get(locale) ?? []).push({
      up_endpoint: device.up_endpoint,
      up_auth_key: device.up_auth_key,
    });
  }

  return { devices, webPushSubscriptions, upSubscriptions, accountLocaleMap };
}

/**
 * Sends notifications for items to grouped devices
 */
export async function sendItemNotifications(
  itemNotifications: ItemNotificationData[],
  groupedDevices: Map<string, Map<NotificationPlatform, string[]>>,
  webPushSubscriptions: Map<string, WebPushSubscription[]>,
  upSubscriptions: Map<string, UPSubscription[]>
): Promise<void> {
  for (const itemNotification of itemNotifications) {
    const messageText = itemNotification.itemTitle;

    const notificationsCtx = getNotificationsContext();
    const firebaseCtx = getFirebaseContext();

    // Send to FCM devices
    for (const [locale, platformMap] of groupedDevices) {
      for (const [platform, tokens] of platformMap) {
        try {
          await notificationOrchestrator(notificationsCtx, {
            service: 'firebase',
            firebaseCtx,
            tokens,
            messageText,
            messageType: itemNotification.messageType,
            locale,
            platform,
            body: itemNotification.channelTitle,
            ...(itemNotification.imageUrl ? { image: itemNotification.imageUrl } : {}),
            linkIdText: itemNotification.itemIdText,
            mediumId: itemNotification.mediumId,
            data: {
              itemIdText: itemNotification.itemIdText,
              channelIdText: itemNotification.channelIdText,
              type: itemNotification.messageType,
            },
          });

          loggerService.info(
            `Sent ${itemNotification.messageType} notification to ${tokens.length} ${platform} devices (${locale}) for item: ${itemNotification.itemIdText}`
          );
        } catch (error) {
          loggerService.logError(
            `Failed to send notification for item ${itemNotification.itemIdText} to ${platform} devices (${locale})`,
            error as Error
          );
        }
      }
    }

    // Send to Web Push subscriptions
    for (const [locale, subscriptions] of webPushSubscriptions) {
      if (subscriptions.length > 0) {
        try {
          await notificationOrchestrator(notificationsCtx, {
            service: 'webpush',
            subscriptions,
            messageText,
            messageType: itemNotification.messageType,
            locale,
            body: itemNotification.channelTitle,
            ...(itemNotification.imageUrl ? { image: itemNotification.imageUrl } : {}),
            linkIdText: itemNotification.itemIdText,
            mediumId: itemNotification.mediumId,
            data: {
              itemIdText: itemNotification.itemIdText,
              channelIdText: itemNotification.channelIdText,
              type: itemNotification.messageType,
            },
          });

          loggerService.info(
            `Sent ${itemNotification.messageType} Web Push notification to ${subscriptions.length} subscription(s) (${locale}) for item: ${itemNotification.itemIdText}`
          );
        } catch (error) {
          loggerService.logError(
            `Failed to send Web Push notification for item ${itemNotification.itemIdText} to ${subscriptions.length} subscription(s) (${locale})`,
            error as Error
          );
        }
      }
    }

    // Send to Unified Push subscriptions
    for (const [locale, subscriptions] of upSubscriptions) {
      if (subscriptions.length > 0) {
        try {
          await notificationOrchestrator(notificationsCtx, {
            service: 'unifiedpush',
            subscriptions,
            messageText,
            messageType: itemNotification.messageType,
            locale,
            body: itemNotification.channelTitle,
            ...(itemNotification.imageUrl ? { image: itemNotification.imageUrl } : {}),
            linkIdText: itemNotification.itemIdText,
            mediumId: itemNotification.mediumId,
            data: {
              itemIdText: itemNotification.itemIdText,
              channelIdText: itemNotification.channelIdText,
              type: itemNotification.messageType,
            },
          });

          loggerService.info(
            `Sent ${itemNotification.messageType} Unified Push notification to ${subscriptions.length} subscription(s) (${locale}) for item: ${itemNotification.itemIdText}`
          );
        } catch (error) {
          loggerService.logError(
            `Failed to send Unified Push notification for item ${itemNotification.itemIdText} to ${subscriptions.length} subscription(s) (${locale})`,
            error as Error
          );
        }
      }
    }
  }
}
