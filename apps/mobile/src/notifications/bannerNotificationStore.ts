import type { DTOAccountNotification } from '@podverse/helpers';

import type { BannerNotificationKind } from './bannerNotificationPolicy';
import { bannerNotificationCopy, shouldShowBannerNotification } from './bannerNotificationPolicy';
import type { BannerNotificationQueueState } from './bannerNotificationQueue';
import {
  clearBannerNotificationQueue as emptyBannerNotificationQueue,
  dismissVisibleBannerNotification as dismissVisibleBannerNotificationState,
  EMPTY_BANNER_NOTIFICATION_QUEUE,
  enqueueBannerNotification,
  removeBannerNotification as removeBannerNotificationState,
} from './bannerNotificationQueue';

/**
 * In-memory banner queue for the signed-in account. One card is visible. The queue module keeps
 * up to three waiting. A notification is enqueued only while the app is active and the
 * Notifications inbox is not on screen. Nothing is kept to show later.
 */

export type BannerNotificationPresentContext = {
  /** The app was active (`AppState` `active`) when the event arrived. */
  appActive: boolean;
  /** The Notifications inbox is on screen. */
  inboxFocused: boolean;
};

type Listener = () => void;

let queueState: BannerNotificationQueueState = EMPTY_BANNER_NOTIFICATION_QUEUE;

const listeners = new Set<Listener>();

const notifyBannerNotificationQueue = (): void => {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch (error: unknown) {
      console.warn('Banner notification queue listener failed', error);
    }
  }
};

const replaceQueue = (next: BannerNotificationQueueState): void => {
  if (next === queueState) {
    return;
  }
  queueState = next;
  notifyBannerNotificationQueue();
};

export function getBannerNotificationQueue(): BannerNotificationQueueState {
  return queueState;
}

/** True while a banner card is on screen. Used to park slide-up dismiss gestures in that band. */
export function isBannerNotificationVisible(): boolean {
  return queueState.visible !== null;
}

export function subscribeBannerNotificationQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function presentBannerNotification(
  notification: DTOAccountNotification,
  enabled: Readonly<Record<BannerNotificationKind, boolean>>,
  context: BannerNotificationPresentContext
): void {
  if (!context.appActive) {
    return;
  }
  if (context.inboxFocused) {
    return;
  }
  if (!shouldShowBannerNotification(notification, enabled)) {
    return;
  }
  const copy = bannerNotificationCopy(notification);
  if (copy === null) {
    return;
  }

  replaceQueue(
    enqueueBannerNotification(queueState, {
      body: copy.body,
      id: notification.id,
      notification,
      title: copy.title,
    })
  );
}

export function dismissVisibleBannerNotification(): void {
  replaceQueue(dismissVisibleBannerNotificationState(queueState));
}

export function removeBannerNotification(id: number): void {
  replaceQueue(removeBannerNotificationState(queueState, id));
}

export function clearBannerNotificationQueue(): void {
  replaceQueue(emptyBannerNotificationQueue());
}
