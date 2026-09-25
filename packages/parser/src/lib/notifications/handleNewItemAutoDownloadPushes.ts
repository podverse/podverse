import { getFirebaseContext, getNotificationsContext } from '@parser/context.js';
import { loggerService } from '@parser/factories/loggerService.js';
import type { HandleParsedItemsResult } from '@parser/lib/rss/item/item.js';

import { AccountFCMDevicePlatformEnum } from '@podverse/helpers';
import { dataOnlyPushOrchestrator } from '@podverse/notifications';
import type { Channel } from '@podverse/orm';
import { AccountDeviceAutoDownloadChannelService, ItemService } from '@podverse/orm';

/**
 * Wakes devices registered for auto download on this channel when new items arrive.
 * Data-only (no banner). Membership is re-checked at send time inside the registration query.
 */
export async function handleNewItemAutoDownloadPushes(
  channel: Channel,
  parsedItemsResult: HandleParsedItemsResult
): Promise<void> {
  try {
    const { newItemGuids, newItemGuidEnclosureUrls } = parsedItemsResult;
    if (newItemGuids.length === 0 && newItemGuidEnclosureUrls.length === 0) {
      return;
    }

    const registrationService = new AccountDeviceAutoDownloadChannelService();
    const [fcmDevices, upDevices] = await Promise.all([
      registrationService.getFcmDevicesForChannel(channel.id),
      registrationService.getUpDevicesForChannel(channel.id),
    ]);

    if (fcmDevices.length === 0 && upDevices.length === 0) {
      return;
    }

    const itemService = new ItemService();
    const items = [];
    if (newItemGuids.length > 0) {
      items.push(...(await itemService.getManyByGuid(channel, newItemGuids)));
    }
    if (newItemGuidEnclosureUrls.length > 0) {
      items.push(
        ...(await itemService.getManyByGuidEnclosureUrl(channel, newItemGuidEnclosureUrls))
      );
    }

    if (items.length === 0) {
      return;
    }

    const itemIdTexts = items
      .map((item) => item.id_text)
      .filter((text): text is string => typeof text === 'string' && text.length > 0);

    if (itemIdTexts.length === 0) {
      return;
    }

    const data: Record<string, unknown> = {
      type: 'auto-download',
      channelIdText: channel.id_text,
      itemIdTexts: itemIdTexts.join(','),
    };

    const iosTokens = fcmDevices
      .filter((device) => device.platform === AccountFCMDevicePlatformEnum.iOS)
      .map((device) => device.fcm_token);
    const androidTokens = fcmDevices
      .filter((device) => device.platform === AccountFCMDevicePlatformEnum.Android)
      .map((device) => device.fcm_token);

    if (iosTokens.length > 0) {
      const notificationsCtx = getNotificationsContext();
      const firebaseCtx = getFirebaseContext();
      await dataOnlyPushOrchestrator(notificationsCtx, {
        service: 'firebase',
        firebaseCtx,
        tokens: iosTokens,
        platform: 'ios',
        data,
      });
    }

    if (androidTokens.length > 0) {
      const notificationsCtx = getNotificationsContext();
      const firebaseCtx = getFirebaseContext();
      await dataOnlyPushOrchestrator(notificationsCtx, {
        service: 'firebase',
        firebaseCtx,
        tokens: androidTokens,
        platform: 'android',
        data,
      });
    }

    if (upDevices.length > 0) {
      const notificationsCtx = getNotificationsContext();
      await dataOnlyPushOrchestrator(notificationsCtx, {
        service: 'unifiedpush',
        subscriptions: upDevices.map((device) => ({
          up_endpoint: device.up_endpoint,
          up_auth_key: device.up_auth_key,
        })),
        data,
      });
    }
  } catch (error) {
    loggerService.logError('handleNewItemAutoDownloadPushes', error as Error);
    loggerService.warn(
      `handleNewItemAutoDownloadPushes: Channel ${channel.id_text} — ${(error as Error).message}`
    );
  }
}
