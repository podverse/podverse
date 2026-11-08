import { beforeEach, describe, expect, it, vi } from 'vitest';

type PushProvider = 'fcm' | 'none' | 'unifiedpush';

type NativeDouble = {
  apps: string[];
  os: 'ios' | 'android';
  registered: boolean;
  token: string;
  getToken: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  onTokenRefresh: ReturnType<typeof vi.fn>;
};

const native = vi.hoisted(
  (): NativeDouble => ({
    apps: ['default'],
    os: 'ios',
    registered: false,
    token: 'fcm-registration-token',
    getToken: vi.fn(async () => native.token),
    register: vi.fn(async () => {
      native.registered = true;
    }),
    onTokenRefresh: vi.fn(() => vi.fn()),
  })
);

const configState = vi.hoisted(
  (): { pushProvider: PushProvider } => ({
    pushProvider: 'fcm',
  })
);

vi.mock('@react-native-firebase/app', () => ({
  getApps: () => native.apps,
}));

vi.mock('@react-native-firebase/messaging', () => ({
  getMessaging: () => ({ name: 'messaging' }),
  getToken: () => native.getToken(),
  isDeviceRegisteredForRemoteMessages: () => native.registered,
  onTokenRefresh: (messaging: unknown, listener: (token: string) => void) =>
    native.onTokenRefresh(messaging, listener),
  registerDeviceForRemoteMessages: () => native.register(),
}));

vi.mock('expo-constants', () => ({
  default: { expoConfig: {} },
}));

vi.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  setNotificationChannelAsync: vi.fn(),
}));

vi.mock('react-native', () => ({
  Linking: { openSettings: vi.fn(), sendIntent: vi.fn() },
  Platform: {
    get OS() {
      return native.os;
    },
  },
}));

vi.mock('../config', () => ({
  getMobileConfig: () => ({ pushProvider: configState.pushProvider }),
}));

import { getFcmDeviceToken, onFcmDeviceTokenRefresh } from './fcmTransport';

describe('fcmTransport', () => {
  beforeEach(() => {
    native.apps = ['default'];
    native.os = 'ios';
    native.registered = false;
    native.token = 'fcm-registration-token';
    native.getToken.mockClear();
    native.register.mockClear();
    native.onTokenRefresh.mockClear();
    configState.pushProvider = 'fcm';
  });

  it('returns the FCM registration token and registers iOS for remote messages', async () => {
    await expect(getFcmDeviceToken()).resolves.toBe('fcm-registration-token');
    expect(native.register).toHaveBeenCalledOnce();
    expect(native.getToken).toHaveBeenCalledOnce();
  });

  it('returns null when Firebase has no app', async () => {
    native.apps = [];
    await expect(getFcmDeviceToken()).resolves.toBeNull();
    expect(native.getToken).not.toHaveBeenCalled();
  });

  it('returns null when this build does not use FCM', async () => {
    configState.pushProvider = 'unifiedpush';
    await expect(getFcmDeviceToken()).resolves.toBeNull();
    expect(typeof onFcmDeviceTokenRefresh(() => {})).toBe('function');
    expect(native.getToken).not.toHaveBeenCalled();
    expect(native.onTokenRefresh).not.toHaveBeenCalled();
  });
});
