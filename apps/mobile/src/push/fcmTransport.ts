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

export const getFcmDeviceToken = async (): Promise<string | null> => {
  if (!isFcmPushEnabled()) {
    return null;
  }

  await ensureAndroidNotificationChannel();

  const platform = resolvePushPlatform();
  if (platform === null) {
    return null;
  }

  const pushToken = await Notifications.getDevicePushTokenAsync();
  const token = pushToken.data?.trim();
  return token ? token : null;
};

export const onFcmDeviceTokenRefresh = (
  onRefresh: (token: string) => void
): PushTokenRefreshUnsubscribe => {
  if (!isFcmPushEnabled()) {
    return () => {};
  }

  const subscription = Notifications.addPushTokenListener((nextToken) => {
    const token = nextToken.data?.trim();
    if (token) {
      onRefresh(token);
    }
  });

  return () => {
    subscription.remove();
  };
};

export const openSystemNotificationSettings = async (): Promise<void> => {
  await Linking.openSettings();
};
