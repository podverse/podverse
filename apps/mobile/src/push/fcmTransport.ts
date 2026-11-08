import { getApps } from '@react-native-firebase/app';
import {
  getMessaging,
  getToken,
  isDeviceRegisteredForRemoteMessages,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
} from '@react-native-firebase/messaging';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import type { AccountFCMDevicePlatformValues } from '@podverse/helpers/dto';
import { AccountFCMDevicePlatformEnum } from '@podverse/helpers/dto';

import { getMobileConfig } from '../config';

export type PushPermissionRequestResult = {
  canAskAgain: boolean;
  granted: boolean;
};

export type PushTokenRefreshUnsubscribe = () => void;

type PushPlatform = Extract<
  AccountFCMDevicePlatformValues,
  AccountFCMDevicePlatformEnum.Android | AccountFCMDevicePlatformEnum.iOS
>;

const ANDROID_APP_NOTIFICATION_SETTINGS = 'android.settings.APP_NOTIFICATION_SETTINGS';
const ANDROID_EXTRA_APP_PACKAGE = 'android.provider.extra.APP_PACKAGE';

const isFcmPushEnabled = (): boolean => {
  return getMobileConfig().pushProvider === 'fcm';
};

const resolvePushPlatform = (): PushPlatform | null => {
  if (Platform.OS === 'android') {
    return AccountFCMDevicePlatformEnum.Android;
  }
  if (Platform.OS === 'ios') {
    return AccountFCMDevicePlatformEnum.iOS;
  }
  return null;
};

const ensureAndroidNotificationChannel = async (): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync('default', {
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#FFFFFFFF',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    name: 'Default',
    showBadge: true,
    vibrationPattern: [0, 250, 250, 250],
  });
};

export const getFcmTransportPlatform = (): PushPlatform | null => {
  if (!isFcmPushEnabled()) {
    return null;
  }
  return resolvePushPlatform();
};

export const getFcmPermissionStatus = async (): Promise<PushPermissionRequestResult> => {
  if (!isFcmPushEnabled()) {
    return { canAskAgain: false, granted: false };
  }

  const permissions = await Notifications.getPermissionsAsync();
  return {
    canAskAgain: permissions.canAskAgain,
    granted: permissions.granted,
  };
};

export const requestFcmPermissionAfterUserAction =
  async (): Promise<PushPermissionRequestResult> => {
    if (!isFcmPushEnabled()) {
      return { canAskAgain: false, granted: false };
    }

    await ensureAndroidNotificationChannel();

    const currentPermissions = await Notifications.getPermissionsAsync();
    if (currentPermissions.granted) {
      return {
        canAskAgain: currentPermissions.canAskAgain,
        granted: true,
      };
    }

    const requestedPermissions = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    return {
      canAskAgain: requestedPermissions.canAskAgain,
      granted: requestedPermissions.granted,
    };
  };

const readFcmRegistrationToken = async (): Promise<string | null> => {
  if (getApps().length === 0) {
    return null;
  }

  const messaging = getMessaging();
  if (Platform.OS === 'ios' && !isDeviceRegisteredForRemoteMessages(messaging)) {
    await registerDeviceForRemoteMessages(messaging);
  }

  const token = (await getToken(messaging)).trim();
  return token.length > 0 ? token : null;
};

/**
 * FCM registration token for this install. On iOS this is the Firebase token, which is
 * what workers send. Returns null when this build has no Firebase app, so registration stays quiet.
 */
export const getFcmDeviceToken = async (): Promise<string | null> => {
  if (!isFcmPushEnabled()) {
    return null;
  }

  await ensureAndroidNotificationChannel();

  const platform = resolvePushPlatform();
  if (platform === null) {
    return null;
  }

  try {
    return await readFcmRegistrationToken();
  } catch (error) {
    console.warn('Could not read the FCM registration token', error);
    return null;
  }
};

export const onFcmDeviceTokenRefresh = (
  onRefresh: (token: string) => void
): PushTokenRefreshUnsubscribe => {
  if (!isFcmPushEnabled()) {
    return () => {};
  }

  try {
    if (getApps().length === 0) {
      return () => {};
    }
    return onTokenRefresh(getMessaging(), (nextToken) => {
      const token = nextToken.trim();
      if (token.length > 0) {
        onRefresh(token);
      }
    });
  } catch (error) {
    console.warn('Could not subscribe to FCM token refresh', error);
    return () => {};
  }
};

/**
 * Opens Podverse's notification page in system settings on Android, and Podverse's page in
 * Settings on iOS. Falls back to the app's settings page when Android refuses the intent.
 */
export const openSystemNotificationSettings = async (): Promise<void> => {
  const androidPackage = Constants.expoConfig?.android?.package;
  if (Platform.OS === 'android' && androidPackage !== undefined) {
    try {
      await Linking.sendIntent(ANDROID_APP_NOTIFICATION_SETTINGS, [
        { key: ANDROID_EXTRA_APP_PACKAGE, value: androidPackage },
      ]);
      return;
    } catch (error) {
      console.warn('Could not open app notification settings; opening app settings', error);
    }
  }
  await Linking.openSettings();
};
