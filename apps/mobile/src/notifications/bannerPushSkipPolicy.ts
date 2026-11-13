import type { NotificationCategoryValues } from '@podverse/helpers';
import type { DevicePushState } from '@podverse/helpers/notificationPush';

/**
 * When this device will show a system push for the notification's category, the in-app banner is
 * skipped so the listener does not see the same alert twice.
 */

export type BannerPushSkipInput = {
  category: NotificationCategoryValues;
  /** Account push_enabled by category. Null while preferences have not been loaded. */
  pushEnabledByCategory: Readonly<Partial<Record<NotificationCategoryValues, boolean>>> | null;
  /** This device's push delivery state. Null while it has not been read. */
  devicePushState: DevicePushState | null;
};

/**
 * True when push for this category will present on this device. Preferences or device state that
 * have not loaded yet leave the banner path open so a late reading cannot drop the only alert.
 */
export const shouldSkipBannerForPush = (input: BannerPushSkipInput): boolean => {
  if (input.devicePushState !== 'enabled') {
    return false;
  }
  if (input.pushEnabledByCategory === null) {
    return false;
  }
  return input.pushEnabledByCategory[input.category] === true;
};
