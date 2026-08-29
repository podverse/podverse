import { config as projectConfig } from '@parser/config/index.js';
import { getFirebaseContext, getNotificationsContext } from '@parser/context.js';
import { loggerService } from '@parser/factories/loggerService.js';

import type { AccountNotificationTypeEnum, NotificationCategoryValues } from '@podverse/helpers';
import {
  AccountFCMDevicePlatformEnum,
  buildNotificationLinkPath,
  getDefaultNotificationCategoryPreference,
  hasValidMembership,
} from '@podverse/helpers';
import type {
  NotificationMessageType,
  NotificationPlatform,
  UPSubscription,
  WebPushSubscription,
} from '@podverse/notifications';
import { i18nNotifications, notificationOrchestrator } from '@podverse/notifications';
import type { AccountNotificationChannelType, Channel, ChannelImage, Item } from '@podverse/orm';
import {
  AccountFCMDeviceService,
  AccountNotificationChannelService,
  AccountNotificationPreferenceService,
  AccountNotificationService,
  AccountUPDeviceService,
  AccountWebPushDeviceService,
  ChannelService,
} from '@podverse/orm';

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
 * Gets account IDs for a channel + legacy notification type after entitlement gating.
 */
export async function getAccountIdsForChannelNotification(
  channelIdText: string,
  notificationType: AccountNotificationTypeEnum
): Promise<{ accountIdsWithTypeEnabled: number[]; accountLocaleMap: Map<number, string> } | null> {
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

  const accountIdsWithTypeEnabled: number[] = [];
  const accountLocaleMap = new Map<number, string>();

  for (const notificationChannel of notificationChannels) {
    const hasType = notificationChannel.account_notification_channel_types?.some(
      (type: AccountNotificationChannelType) => type.type === notificationType
    );
    if (!hasType) {
      continue;
    }

    const membershipStatus = notificationChannel.account?.account_membership_status;
    if (!hasValidMembership(membershipStatus)) {
      continue;
    }
    if (membershipStatus?.allow_notifications === false) {
      continue;
    }

    accountIdsWithTypeEnabled.push(notificationChannel.account_id);
    const locale =
      notificationChannel.account?.account_settings?.account_settings_locale?.locale ||
      getDefaultLocale();
    accountLocaleMap.set(notificationChannel.account_id, locale);
  }

  if (accountIdsWithTypeEnabled.length === 0) {
    return null;
  }

  return { accountIdsWithTypeEnabled, accountLocaleMap };
}

/**
 * Gets push/in-app recipients and device payloads for a channel notification type.
 */
export async function getDevicesForNotificationType(
  channelIdText: string,
  notificationType: AccountNotificationTypeEnum,
  category: NotificationCategoryValues
): Promise<{
  devices: DeviceWithLocale[];
  webPushSubscriptions: Map<string, WebPushSubscription[]>;
  upSubscriptions: Map<string, UPSubscription[]>;
  accountLocaleMap: Map<number, string>;
  inAppEnabledAccountIds: number[];
  pushEnabledAccountIds: number[];
} | null> {
  const accountRecipients = await getAccountIdsForChannelNotification(
    channelIdText,
    notificationType
  );
  if (!accountRecipients) {
    return null;
  }
  const { accountIdsWithTypeEnabled, accountLocaleMap } = accountRecipients;

  const accountNotificationPreferenceService = new AccountNotificationPreferenceService();
  const defaultPreference = getDefaultNotificationCategoryPreference(category);
  const inAppEnabledAccountIds: number[] = [];
  const pushEnabledAccountIds: number[] = [];

  for (const accountId of accountIdsWithTypeEnabled) {
    const preferences = await accountNotificationPreferenceService.getForAccount(accountId);
    const categoryPreference = preferences.find((preference) => preference.category === category);
    const inAppEnabled = categoryPreference?.in_app_enabled ?? defaultPreference.in_app_enabled;
    const pushEnabled = categoryPreference?.push_enabled ?? defaultPreference.push_enabled;

    if (inAppEnabled) {
      inAppEnabledAccountIds.push(accountId);
    }
    if (pushEnabled) {
      pushEnabledAccountIds.push(accountId);
    }
  }

  if (inAppEnabledAccountIds.length === 0 && pushEnabledAccountIds.length === 0) {
    return null;
  }

  if (pushEnabledAccountIds.length === 0) {
    return {
      devices: [],
      webPushSubscriptions: new Map(),
      upSubscriptions: new Map(),
      accountLocaleMap,
      inAppEnabledAccountIds,
      pushEnabledAccountIds,
    };
  }

  // Get all FCM devices for push-enabled accounts in a single batch query
  const accountFCMDeviceService = new AccountFCMDeviceService();
  const deviceResults = await accountFCMDeviceService.getAllForAccountIds(pushEnabledAccountIds);

  // Get all Web Push devices for push-enabled accounts in a single batch query
  const accountWebPushDeviceService = new AccountWebPushDeviceService();
  const webPushDeviceResults =
    await accountWebPushDeviceService.getAllForAccountIds(pushEnabledAccountIds);

  // Get all Unified Push devices for push-enabled accounts in a single batch query
  const accountUPDeviceService = new AccountUPDeviceService();
  const upDeviceResults = await accountUPDeviceService.getAllForAccountIds(pushEnabledAccountIds);

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

  return {
    devices,
    webPushSubscriptions,
    upSubscriptions,
    accountLocaleMap,
    inAppEnabledAccountIds,
    pushEnabledAccountIds,
  };
}

export function getInAppNotificationTitle(
  messageType: NotificationMessageType,
  messageText: string
): string {
  const localeMap = i18nNotifications['en-US'];
  const prefix = localeMap ? localeMap[messageType] : '';
  return `${prefix}${messageText}`;
}

export function getInAppNotificationLinkPath(
  itemNotification: ItemNotificationData
): string | null {
  return buildNotificationLinkPath({
    channelIdText: itemNotification.channelIdText,
    itemIdText: itemNotification.itemIdText,
    mediumId: itemNotification.mediumId,
    messageType: itemNotification.messageType,
  });
}

export async function createInAppNotificationsForAccounts(params: {
  accountIds: number[];
  category: NotificationCategoryValues;
  title: string;
  body: string | null;
  linkPath: string | null;
  payload: Record<string, unknown> | null;
}): Promise<number> {
  if (params.accountIds.length === 0) {
    return 0;
  }

  const accountNotificationService = new AccountNotificationService();
  const createdRows = await accountNotificationService.createMany(
    params.accountIds.map((accountId) => ({
      account_id: accountId,
      body: params.body,
      category: params.category,
      link_path: params.linkPath,
      payload: params.payload,
      title: params.title,
    }))
  );
  return createdRows.length;
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
