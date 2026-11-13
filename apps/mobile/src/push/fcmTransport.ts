import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Linking, Platform, TurboModuleRegistry } from 'react-native';

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
/** Turbo module name from `@react-native-firebase/app`. Absent when this binary has no Firebase config. */
const FIREBASE_APP_NATIVE_MODULE = 'NativeRNFBTurboApp';

type FirebaseMessaging = object;

type FirebaseModules = {
  getApps: () => readonly unknown[];
  getMessaging: () => FirebaseMessaging;
  getToken: (messaging: FirebaseMessaging) => Promise<string>;
  isDeviceRegisteredForRemoteMessages: (messaging: FirebaseMessaging) => boolean;
  onTokenRefresh: (messaging: FirebaseMessaging, listener: (token: string) => void) => () => void;
  registerDeviceForRemoteMessages: (messaging: FirebaseMessaging) => Promise<void>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFunction = (value: unknown): value is (...args: unknown[]) => unknown =>
  typeof value === 'function';

/**
 * Loads Firebase only when the native module is in this binary. A static import evaluates the
 * package at startup and stops a build that left Firebase unlinked.
 */
const loadFirebaseModules = (): FirebaseModules | null => {
  const nativeModule = TurboModuleRegistry.get(FIREBASE_APP_NATIVE_MODULE);
  if (nativeModule === null || nativeModule === undefined) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded only after the native module is registered
  const app: unknown = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded only after the native module is registered
  const messaging: unknown = require('@react-native-firebase/messaging');
  if (!isRecord(app) || !isRecord(messaging)) {
    return null;
  }

  const { getApps } = app;
  const {
    getMessaging,
    getToken,
    isDeviceRegisteredForRemoteMessages,
    onTokenRefresh,
    registerDeviceForRemoteMessages,
  } = messaging;
  if (
    !isFunction(getApps) ||
    !isFunction(getMessaging) ||
    !isFunction(getToken) ||
    !isFunction(isDeviceRegisteredForRemoteMessages) ||
    !isFunction(onTokenRefresh) ||
    !isFunction(registerDeviceForRemoteMessages)
  ) {
    return null;
  }

  return {
    getApps: () => {
      const apps = getApps();
      return Array.isArray(apps) ? apps : [];
    },
    getMessaging: () => {
      const messaging = getMessaging();
      return isRecord(messaging) ? messaging : {};
    },
    getToken: (instance) => Promise.resolve(getToken(instance)).then((token) => String(token)),
    isDeviceRegisteredForRemoteMessages: (instance) =>
      isDeviceRegisteredForRemoteMessages(instance) === true,
    onTokenRefresh: (instance, listener) => {
      const unsubscribe = onTokenRefresh(instance, listener);
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    },
    registerDeviceForRemoteMessages: (instance) =>
      Promise.resolve(registerDeviceForRemoteMessages(instance)).then(() => undefined),
  };
};

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
  const firebase = loadFirebaseModules();
  if (firebase === null || firebase.getApps().length === 0) {
    return null;
  }

  const messaging = firebase.getMessaging();
  if (Platform.OS === 'ios' && !firebase.isDeviceRegisteredForRemoteMessages(messaging)) {
    await firebase.registerDeviceForRemoteMessages(messaging);
  }

  const token = (await firebase.getToken(messaging)).trim();
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
    const firebase = loadFirebaseModules();
    if (firebase === null || firebase.getApps().length === 0) {
      return () => {};
    }
    return firebase.onTokenRefresh(firebase.getMessaging(), (nextToken) => {
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
