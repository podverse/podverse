'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import type { AccountNotificationStreamEvent, AccountPlaybackStreamEvent } from '@podverse/helpers';

import { getApiRequestService, getClientApiBaseUrl } from '../factories/apiRequestService';
import { useNotificationsUnreadCount } from '../hooks/useNotificationsUnreadCount';
import { reportSessionEnded } from '../lib/auth/sessionEndedNotice';
import type { NotificationStreamStatus } from '../lib/notifications/stream/notificationStreamConnection';
import { startNotificationStreamCoordinator } from '../lib/notifications/stream/notificationStreamCoordinator';
import { getNotificationStreamEventUnreadCount } from '../lib/notifications/stream/notificationStreamEventUnreadCount';
import type { PushMarkReadParams } from '../lib/notifications/webpush/foregroundPush';
import {
  buildForegroundPushNotificationOptions,
  readForegroundPushMessage,
  shouldShowForegroundPushPopup,
} from '../lib/notifications/webpush/foregroundPush';
import {
  ensureWebPushServiceWorkerScriptUrl,
  WEB_PUSH_SERVICE_WORKER_PATH,
} from '../lib/notifications/webpush/webPushServiceWorkerUrl';
import { useAccount } from './Account';
import { useConfig } from './Config';

type NotificationsContextType = {
  permission: NotificationPermission;
  setPermission: (val: NotificationPermission) => void;
  registered: boolean;
  setRegistered: (val: boolean) => void;
  upRegistered: boolean;
  setUPRegistered: (val: boolean) => void;
  upEndpoint: string | null;
  setUPEndpoint: (val: string | null) => void;
  unreadCount: number;
  notificationStreamStatus: NotificationStreamStatus;
  /** True while this tab holds the account stream for the browser profile. */
  notificationStreamIsLeader: boolean;
  /** Subscribe to parsed stream events in this tab. Returns the unsubscribe function. */
  subscribeToNotificationStream: (
    listener: (event: AccountNotificationStreamEvent) => void
  ) => () => void;
  /** Subscribe to parsed playback stream events in this tab. Returns the unsubscribe function. */
  subscribeToPlaybackStream: (
    listener: (event: AccountPlaybackStreamEvent, receivedAtMs: number) => void
  ) => () => void;
  /** True once this page has checked this browser's permission and registration for the account. */
  pushStateChecked: boolean;
  /** Re-reads `Notification.permission` and whether this browser's subscription is registered. */
  refreshWebPushRegistration: () => Promise<void>;
};

export const NotificationsContext = createContext<NotificationsContextType>({
  permission: 'default',
  setPermission: () => {},
  registered: false,
  setRegistered: () => {},
  upRegistered: false,
  setUPRegistered: () => {},
  upEndpoint: null,
  setUPEndpoint: () => {},
  unreadCount: 0,
  notificationStreamStatus: 'off',
  notificationStreamIsLeader: false,
  subscribeToNotificationStream: () => () => {},
  subscribeToPlaybackStream: () => () => {},
  pushStateChecked: false,
  refreshWebPushRegistration: async () => {},
});

type NotificationsProviderProps = {
  children: ReactNode;
};

const toSameOriginPath = (link: string): string | null => {
  try {
    const parsed = new URL(link, window.location.origin);
    if (parsed.origin !== window.location.origin) {
      return null;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
};

export const NotificationsProvider = ({ children }: NotificationsProviderProps) => {
  const config = useConfig();
  const vapidPublicKey = config.public.notifications.webpush.vapidPublicKey;
  const router = useRouter();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [pushStateChecked, setPushStateChecked] = useState(false);
  const [registered, setRegistered] = useState<boolean>(false);
  const [upRegistered, setUPRegistered] = useState<boolean>(false);
  const [upEndpoint, setUPEndpoint] = useState<string | null>(null);
  const [notificationStreamStatus, setNotificationStreamStatus] =
    useState<NotificationStreamStatus>('off');
  const [notificationStreamIsLeader, setNotificationStreamIsLeader] = useState(false);
  const { loggedInAccount } = useAccount();
  const accountId = loggedInAccount?.id ?? null;
  const { unreadCount, setUnreadCount } = useNotificationsUnreadCount({
    enabled: accountId !== null,
    streamOpen: notificationStreamStatus === 'open',
  });
  const streamListenersRef = useRef(new Set<(event: AccountNotificationStreamEvent) => void>());
  const playbackStreamListenersRef = useRef(
    new Set<(event: AccountPlaybackStreamEvent, receivedAtMs: number) => void>()
  );
  const subscribeToNotificationStream = useCallback(
    (listener: (event: AccountNotificationStreamEvent) => void) => {
      const listeners = streamListenersRef.current;
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    []
  );
  const subscribeToPlaybackStream = useCallback(
    (listener: (event: AccountPlaybackStreamEvent, receivedAtMs: number) => void) => {
      const listeners = playbackStreamListenersRef.current;
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    []
  );

  const markPushNotificationRead = useCallback(
    (params: PushMarkReadParams) => {
      try {
        void getApiRequestService()
          .reqNotificationsMarkReadByItem(params)
          .then((response) => {
            setUnreadCount(response.unread_count);
          })
          .catch(() => undefined);
      } catch {
        // A failed mark leaves navigation and the badge update to the stream or the next poll.
      }
    },
    [setUnreadCount]
  );

  const handleForegroundPush = useCallback(
    (event: MessageEvent<unknown>) => {
      const notification = readForegroundPushMessage(event.data);
      if (notification === null) {
        return;
      }
      if (!shouldShowForegroundPushPopup(window.location.pathname)) {
        return;
      }
      if (Notification.permission !== 'granted') {
        return;
      }

      const shownOptions = buildForegroundPushNotificationOptions(notification);
      try {
        const popup = new Notification(notification.title, {
          body: notification.body,
          icon: notification.icon,
          tag: shownOptions.tag,
          data: { url: notification.link },
        });

        popup.onclick = (clickEvent) => {
          clickEvent.preventDefault();
          popup.close();
          window.focus();
          if (notification.markRead !== null) {
            markPushNotificationRead(notification.markRead);
          }
          const sameOriginPath = toSameOriginPath(notification.link);
          if (sameOriginPath !== null && sameOriginPath !== '/') {
            router.push(sameOriginPath);
            return;
          }
          if (sameOriginPath === null && notification.link !== '/') {
            window.location.assign(notification.link);
          }
        };
      } catch {
        // Chrome on Android allows notifications only through the service worker registration.
        if (!('serviceWorker' in navigator)) {
          console.warn('Could not show the foreground push notification');
          return;
        }
        void navigator.serviceWorker
          .getRegistration(WEB_PUSH_SERVICE_WORKER_PATH)
          .then((registration) => registration?.showNotification(notification.title, shownOptions))
          .catch((error: unknown) => {
            console.warn('Could not show the foreground push notification', error);
          });
      }
    },
    [markPushNotificationRead, router]
  );

  const refreshWebPushRegistration = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }
    const currentPermission = Notification.permission;
    setPermission(currentPermission);
    if (currentPermission !== 'granted' || !vapidPublicKey) {
      setRegistered(false);
      return;
    }
    try {
      const registration = await navigator.serviceWorker.getRegistration(
        WEB_PUSH_SERVICE_WORKER_PATH
      );
      const subscription = registration ? await registration.pushManager.getSubscription() : null;
      if (subscription === null) {
        setRegistered(false);
        return;
      }
      const devices = await getApiRequestService().reqAccountWebPushDeviceGetAllForAccount();
      setRegistered(devices.some((device) => device.endpoint === subscription.endpoint));
    } catch (error) {
      console.warn('Could not check this browser web push registration', error);
      setRegistered(false);
    }
  }, [vapidPublicKey]);

  useEffect(() => {
    setPushStateChecked(false);
    if (!loggedInAccount) {
      return;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    const apiRequestService = getApiRequestService();

    const init = async () => {
      const p = Notification.permission;
      setPermission(p);
      if (p === 'granted') {
        void ensureWebPushServiceWorkerScriptUrl(getClientApiBaseUrl());
      }

      try {
        const upDevice = await apiRequestService.reqAccountUPDeviceGetForAccount();
        if (upDevice) {
          setUPRegistered(true);
          setUPEndpoint(upDevice.up_endpoint);
        } else {
          setUPRegistered(false);
          setUPEndpoint(null);
        }
      } catch (e) {
        console.warn('Could not fetch UP device to determine registration', e);
        setUPRegistered(false);
        setUPEndpoint(null);
      }

      await refreshWebPushRegistration();
      setPushStateChecked(true);
    };

    init();

    // Set up listener for foreground push messages from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleForegroundPush);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleForegroundPush);
      }
    };
  }, [loggedInAccount, handleForegroundPush, refreshWebPushRegistration]);

  useEffect(() => {
    if (accountId === null) {
      setNotificationStreamStatus('off');
      setNotificationStreamIsLeader(false);
      return;
    }

    const listeners = streamListenersRef.current;
    const playbackListeners = playbackStreamListenersRef.current;
    const coordinator = startNotificationStreamCoordinator({
      accountId,
      apiBaseUrl: getClientApiBaseUrl(),
      onStatus: setNotificationStreamStatus,
      onLeadership: setNotificationStreamIsLeader,
      onEvent: (event) => {
        const nextUnreadCount = getNotificationStreamEventUnreadCount(event);
        if (nextUnreadCount !== null) {
          setUnreadCount(nextUnreadCount);
        }
        for (const listener of listeners) {
          listener(event);
        }
      },
      onPlaybackEvent: (event, receivedAtMs) => {
        for (const listener of playbackListeners) {
          listener(event, receivedAtMs);
        }
      },
      onSessionEnded: reportSessionEnded,
    });

    return () => {
      coordinator.stop();
    };
  }, [accountId, setUnreadCount]);

  return (
    <NotificationsContext.Provider
      value={{
        permission,
        setPermission,
        registered,
        setRegistered,
        upRegistered,
        setUPRegistered,
        upEndpoint,
        setUPEndpoint,
        unreadCount,
        notificationStreamStatus,
        notificationStreamIsLeader,
        subscribeToNotificationStream,
        subscribeToPlaybackStream,
        pushStateChecked,
        refreshWebPushRegistration,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return ctx;
}
