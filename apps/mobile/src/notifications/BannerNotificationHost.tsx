import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DTOAccountNotification } from '@podverse/helpers';
import {
  accountNotificationImageUrl,
  formatAccountNotificationLine,
  formatRelativeTimeLabel,
} from '@podverse/helpers';

import type { AuthStatus } from '../auth/AuthProvider';
import { useAuth } from '../auth/AuthProvider';
import type { AuthRequestDeps } from '../auth/authRequestWithRefresh';
import { BannerNotification } from '../components/feedback/BannerNotification';
import { isMobileE2eFromEnv } from '../config/env';
import { notificationsRepository } from '../data/repositories';
import { getReduceMotionSnapshot } from '../hooks/useReduceMotion';
import {
  getBannerNotificationEnabled,
  hydrateBannerNotificationPrefs,
  isBannerNotificationPrefsHydrated,
  subscribeBannerNotificationPrefs,
} from '../prefs/bannerNotificationPrefs';
import { readDevicePushState } from '../push/devicePushState.read';
import { openAccountNotificationLink } from '../push/openAccountNotificationLink';
import { useTheme } from '../theme/useTheme';
import { accountNotificationLineLabels } from './accountNotificationLineLabels';
import {
  clearAccountPushPreferences,
  getAccountPushPreferenceSnapshot,
  setAccountPushPreferences,
  setDevicePushStateForBanners,
  subscribeAccountPushPreferences,
} from './accountPushPreferenceStore';
import { presentE2eBannerNotification } from './bannerNotificationE2e';
import type { BannerNotificationKind } from './bannerNotificationPolicy';
import {
  clearBannerNotificationQueue,
  dismissVisibleBannerNotification,
  getBannerNotificationQueue,
  presentBannerNotification,
  removeBannerNotification,
  subscribeBannerNotificationQueue,
} from './bannerNotificationStore';
import { shouldSkipBannerForPush } from './bannerPushSkipPolicy';
import { markNotificationReadById } from './notificationReadActions';
import {
  isNotificationsInboxFocused,
  subscribeNotificationsInboxFocus,
  subscribeNotificationStreamEvents,
} from './notificationStreamStore';
import { playBannerNotificationHaptic } from './playBannerNotificationHaptic';

/**
 * Presents the banner queue above the navigator. Touches outside the card pass through.
 * Subscriptions start after the first paint. A notification that arrives while the app is not
 * active is dropped: it is not shown and it is not kept for the return to the foreground. When
 * this device will show a system push for that category, the banner is skipped.
 */

const HELD_BANNER_NOTIFICATION_LIMIT = 4;

type BannerNotificationAuth = AuthRequestDeps & { status: AuthStatus };

const isPushSkipSnapshotReady = (authStatus: AuthStatus): boolean => {
  if (authStatus !== 'authenticated') {
    return true;
  }
  const snapshot = getAccountPushPreferenceSnapshot();
  return snapshot.devicePushState !== null && snapshot.pushEnabledByCategory !== null;
};

const presentHeldBannerNotifications = (
  held: readonly DTOAccountNotification[],
  enabled: Readonly<Record<BannerNotificationKind, boolean>>
): void => {
  const context = {
    appActive: AppState.currentState === 'active',
    inboxFocused: isNotificationsInboxFocused(),
  };
  const pushSnapshot = getAccountPushPreferenceSnapshot();
  for (const notification of held) {
    if (
      shouldSkipBannerForPush({
        category: notification.category,
        devicePushState: pushSnapshot.devicePushState,
        pushEnabledByCategory: pushSnapshot.pushEnabledByCategory,
      })
    ) {
      continue;
    }
    presentBannerNotification(notification, enabled, context);
  }
};

export function BannerNotificationHost() {
  const { i18n, t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const authRef = useRef<BannerNotificationAuth>({
    accessToken,
    clearSession,
    refreshToken,
    setTokens,
    status,
  });
  const heldRef = useRef<DTOAccountNotification[]>([]);
  const hapticNotificationIdRef = useRef<number | null>(null);

  const enabled = useSyncExternalStore(
    subscribeBannerNotificationPrefs,
    getBannerNotificationEnabled
  );
  const queue = useSyncExternalStore(subscribeBannerNotificationQueue, getBannerNotificationQueue);
  const prefsHydrated = useSyncExternalStore(
    subscribeBannerNotificationPrefs,
    isBannerNotificationPrefsHydrated
  );
  const pushSnapshot = useSyncExternalStore(
    subscribeAccountPushPreferences,
    getAccountPushPreferenceSnapshot
  );

  const slotStyle = useMemo(
    () => ({
      marginHorizontal: tokens.spacing.lg,
      marginTop: insets.top + tokens.spacing.sm,
    }),
    [insets.top, tokens]
  );

  useEffect(() => {
    authRef.current = { accessToken, clearSession, refreshToken, setTokens, status };
  });

  useEffect(() => {
    void hydrateBannerNotificationPrefs();
  }, []);

  useEffect(() => {
    if (status !== 'authenticated' || accessToken === null) {
      clearAccountPushPreferences();
      return;
    }

    let cancelled = false;
    const auth = {
      accessToken,
      clearSession,
      refreshToken,
      setTokens,
    };

    void (async () => {
      try {
        const [preferences, devicePushState] = await Promise.all([
          notificationsRepository.listPreferences(auth),
          readDevicePushState(),
        ]);
        if (cancelled) {
          return;
        }
        setAccountPushPreferences(preferences);
        setDevicePushStateForBanners(devicePushState);
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }
        console.warn('Could not load push preferences for banner skip', error);
        try {
          setDevicePushStateForBanners(await readDevicePushState());
        } catch {
          setDevicePushStateForBanners('unsupported');
        }
        setAccountPushPreferences([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, clearSession, refreshToken, setTokens, status]);

  useEffect(() => {
    return subscribeNotificationStreamEvents((event) => {
      if (event.type === 'created') {
        if (AppState.currentState !== 'active') {
          return;
        }
        if (
          !isBannerNotificationPrefsHydrated() ||
          !isPushSkipSnapshotReady(authRef.current.status)
        ) {
          const held = heldRef.current;
          held.push(event.notification);
          if (held.length > HELD_BANNER_NOTIFICATION_LIMIT) {
            held.splice(0, held.length - HELD_BANNER_NOTIFICATION_LIMIT);
          }
          return;
        }
        if (
          shouldSkipBannerForPush({
            category: event.notification.category,
            devicePushState: getAccountPushPreferenceSnapshot().devicePushState,
            pushEnabledByCategory: getAccountPushPreferenceSnapshot().pushEnabledByCategory,
          })
        ) {
          return;
        }
        presentBannerNotification(event.notification, getBannerNotificationEnabled(), {
          appActive: AppState.currentState === 'active',
          inboxFocused: isNotificationsInboxFocused(),
        });
        return;
      }
      if (event.type === 'read' && event.scope === 'one') {
        removeBannerNotification(event.notificationId);
        return;
      }
      if (event.type === 'read' && event.scope === 'all') {
        clearBannerNotificationQueue();
      }
    });
  }, []);

  useEffect(() => {
    return subscribeNotificationsInboxFocus(() => {
      if (isNotificationsInboxFocused()) {
        clearBannerNotificationQueue();
      }
    });
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'background') {
        return;
      }
      clearBannerNotificationQueue();
      heldRef.current = [];
    });
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (status !== 'anonymous') {
      return;
    }
    heldRef.current = [];
  }, [status]);

  useEffect(() => {
    if (!prefsHydrated) {
      return;
    }
    if (status === 'authenticated' && !isPushSkipSnapshotReady(status)) {
      return;
    }
    const held = heldRef.current.splice(0, heldRef.current.length);
    if (status === 'anonymous') {
      return;
    }
    presentHeldBannerNotifications(held, enabled);
  }, [enabled, prefsHydrated, pushSnapshot, status]);

  const visibleId = queue.visible === null ? null : queue.visible.id;
  useEffect(() => {
    if (visibleId === null) {
      hapticNotificationIdRef.current = null;
      return;
    }
    if (hapticNotificationIdRef.current === visibleId) {
      return;
    }
    hapticNotificationIdRef.current = visibleId;
    playBannerNotificationHaptic(getReduceMotionSnapshot());
  }, [visibleId]);

  const e2ePresentControl = isMobileE2eFromEnv() ? (
    <Pressable
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onPress={() => {
        presentE2eBannerNotification();
      }}
      style={styles.e2ePresent}
      testID="e2e-present-banner-notification"
    />
  ) : null;

  if (queue.visible === null) {
    return e2ePresentControl;
  }

  const visible = queue.visible;

  return (
    <View pointerEvents="box-none" style={styles.host}>
      {e2ePresentControl}
      <View pointerEvents="box-none" style={slotStyle}>
        <BannerNotification
          accessibilityHint={t('settings.notifications.banner_open_hint')}
          body={formatRelativeTimeLabel(visible.notification.created_at, i18n.language) || null}
          dismissLabel={t('settings.notifications.banner_dismiss')}
          imageUrl={accountNotificationImageUrl(visible.notification.payload)}
          notificationId={visible.id}
          onClosed={() => {
            dismissVisibleBannerNotification();
          }}
          onPress={() => {
            const { notification } = visible;
            if (authRef.current.status === 'authenticated') {
              void markNotificationReadById(authRef.current, notification.id);
            }
            void openAccountNotificationLink(notification);
          }}
          title={formatAccountNotificationLine(
            visible.notification,
            accountNotificationLineLabels(t)
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  e2ePresent: {
    height: 1,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 1,
  },
  host: {
    ...StyleSheet.absoluteFill,
  },
});
