import type {
  DTOAccountNotificationPreference,
  NotificationCategoryValues,
} from '@podverse/helpers';
import type { DevicePushState } from '@podverse/helpers/notificationPush';

/**
 * In-memory account push preferences and this device's push delivery state, used to decide whether
 * an in-app banner would duplicate a system push. Cleared when the session ends.
 */

type Listener = () => void;

type AccountPushPreferenceSnapshot = {
  devicePushState: DevicePushState | null;
  pushEnabledByCategory: Readonly<Partial<Record<NotificationCategoryValues, boolean>>> | null;
};

const EMPTY_SNAPSHOT: AccountPushPreferenceSnapshot = Object.freeze({
  devicePushState: null,
  pushEnabledByCategory: null,
});

let snapshot: AccountPushPreferenceSnapshot = EMPTY_SNAPSHOT;
const listeners = new Set<Listener>();

const notify = (): void => {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch (error: unknown) {
      console.warn('Account push preference listener failed', error);
    }
  }
};

const replaceSnapshot = (next: AccountPushPreferenceSnapshot): void => {
  if (
    next.devicePushState === snapshot.devicePushState &&
    next.pushEnabledByCategory === snapshot.pushEnabledByCategory
  ) {
    return;
  }
  snapshot = next;
  notify();
};

export const getAccountPushPreferenceSnapshot = (): AccountPushPreferenceSnapshot => {
  return snapshot;
};

export const subscribeAccountPushPreferences = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const setAccountPushPreferences = (
  preferences: readonly DTOAccountNotificationPreference[]
): void => {
  const pushEnabledByCategory: Partial<Record<NotificationCategoryValues, boolean>> = {};
  for (const row of preferences) {
    pushEnabledByCategory[row.category] = row.push_enabled;
  }
  replaceSnapshot({
    devicePushState: snapshot.devicePushState,
    pushEnabledByCategory: Object.freeze(pushEnabledByCategory),
  });
};

export const setDevicePushStateForBanners = (devicePushState: DevicePushState): void => {
  replaceSnapshot({
    devicePushState,
    pushEnabledByCategory: snapshot.pushEnabledByCategory,
  });
};

export const clearAccountPushPreferences = (): void => {
  replaceSnapshot(EMPTY_SNAPSHOT);
};
