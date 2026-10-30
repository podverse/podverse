import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DTOAccountNotification } from '@podverse/helpers';
import { NotificationCategoryEnum } from '@podverse/helpers';

import {
  applyBannerCategoryEnabled,
  DEFAULT_BANNER_NOTIFICATION_ENABLED,
} from './bannerNotificationPolicy';
import { EMPTY_BANNER_NOTIFICATION_QUEUE } from './bannerNotificationQueue';
import type { BannerNotificationPresentContext } from './bannerNotificationStore';
import {
  clearBannerNotificationQueue,
  getBannerNotificationQueue,
  presentBannerNotification,
  removeBannerNotification,
  subscribeBannerNotificationQueue,
} from './bannerNotificationStore';

const showing: BannerNotificationPresentContext = {
  appActive: true,
  inboxFocused: false,
};

const notification = (
  overrides: Partial<DTOAccountNotification> & { id: number }
): DTOAccountNotification => ({
  account_id: 1,
  body: 'A new episode is out',
  category: NotificationCategoryEnum.NewContent,
  created_at: '2026-01-01T00:00:00.000Z',
  expires_at: '2026-02-01T00:00:00.000Z',
  is_unread: true,
  link_path: '/notifications',
  payload: null,
  title: 'New episode',
  ...overrides,
});

describe('bannerNotificationStore', () => {
  beforeEach(() => {
    clearBannerNotificationQueue();
  });

  it('shows a new-content notification when the app is active and the inbox is not', () => {
    const item = notification({ id: 1 });

    presentBannerNotification(item, DEFAULT_BANNER_NOTIFICATION_ENABLED, showing);

    expect(getBannerNotificationQueue().visible).toMatchObject({
      body: 'A new episode is out',
      id: 1,
      notification: item,
      title: 'New episode',
    });
    expect(getBannerNotificationQueue().waiting).toEqual([]);
  });

  it('leaves the queue empty while the Notifications inbox is on screen', () => {
    presentBannerNotification(notification({ id: 1 }), DEFAULT_BANNER_NOTIFICATION_ENABLED, {
      appActive: true,
      inboxFocused: true,
    });

    expect(getBannerNotificationQueue()).toEqual(EMPTY_BANNER_NOTIFICATION_QUEUE);
  });

  it('drops a notification that arrives while the app is not active and does not keep it', () => {
    presentBannerNotification(notification({ id: 1 }), DEFAULT_BANNER_NOTIFICATION_ENABLED, {
      appActive: false,
      inboxFocused: false,
    });

    expect(getBannerNotificationQueue()).toEqual(EMPTY_BANNER_NOTIFICATION_QUEUE);

    presentBannerNotification(
      notification({ id: 2, title: 'Second' }),
      DEFAULT_BANNER_NOTIFICATION_ENABLED,
      showing
    );

    expect(getBannerNotificationQueue().visible?.id).toBe(2);
    expect(getBannerNotificationQueue().waiting).toEqual([]);
  });

  it('does not show a scheduled livestream when that switch is off', () => {
    presentBannerNotification(
      notification({
        body: 'Soon',
        category: NotificationCategoryEnum.Livestream,
        id: 3,
        payload: { type: 'livestream-scheduled' },
        title: 'Live later',
      }),
      applyBannerCategoryEnabled(
        NotificationCategoryEnum.Livestream,
        false,
        DEFAULT_BANNER_NOTIFICATION_ENABLED
      ),
      showing
    );

    expect(getBannerNotificationQueue()).toEqual(EMPTY_BANNER_NOTIFICATION_QUEUE);
  });

  it('does not show a notification with an empty title and a null body', () => {
    presentBannerNotification(
      notification({ body: null, id: 4, title: '' }),
      DEFAULT_BANNER_NOTIFICATION_ENABLED,
      showing
    );

    expect(getBannerNotificationQueue()).toEqual(EMPTY_BANNER_NOTIFICATION_QUEUE);
  });

  it('promotes the next waiting card when the visible id is removed', () => {
    presentBannerNotification(
      notification({ id: 1, title: 'First' }),
      DEFAULT_BANNER_NOTIFICATION_ENABLED,
      showing
    );
    presentBannerNotification(
      notification({ id: 2, title: 'Second' }),
      DEFAULT_BANNER_NOTIFICATION_ENABLED,
      showing
    );

    removeBannerNotification(1);

    expect(getBannerNotificationQueue().visible?.id).toBe(2);
    expect(getBannerNotificationQueue().waiting).toEqual([]);
  });

  it('empties the queue on clear', () => {
    presentBannerNotification(
      notification({ id: 1 }),
      DEFAULT_BANNER_NOTIFICATION_ENABLED,
      showing
    );

    clearBannerNotificationQueue();

    expect(getBannerNotificationQueue()).toEqual(EMPTY_BANNER_NOTIFICATION_QUEUE);
  });

  it('logs a listener that throws and still notifies the others', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const throwing = vi.fn(() => {
      throw new Error('listener failed');
    });
    const healthy = vi.fn();
    const unsubscribeThrowing = subscribeBannerNotificationQueue(throwing);
    const unsubscribeHealthy = subscribeBannerNotificationQueue(healthy);

    presentBannerNotification(
      notification({ id: 1 }),
      DEFAULT_BANNER_NOTIFICATION_ENABLED,
      showing
    );

    expect(throwing).toHaveBeenCalledTimes(1);
    expect(healthy).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);

    unsubscribeThrowing();
    unsubscribeHealthy();
    warn.mockRestore();
  });
});
