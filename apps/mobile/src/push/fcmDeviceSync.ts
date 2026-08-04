import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';

import { createMobileApiRequestService } from '../auth/mobileApi';
import {
  getFcmDeviceToken,
  getFcmPermissionStatus,
  getFcmTransportPlatform,
  onFcmDeviceTokenRefresh,
} from './fcmTransport';

const INSTALLATION_ID_KEY = 'push.installationId';
const REGISTERED_FCM_TOKEN_KEY = 'push.fcm.registeredToken';

let stopTokenRefreshSubscription: (() => void) | null = null;

const readSecureValue = async (key: string): Promise<string | null> => {
  return SecureStore.getItemAsync(key);
};

const writeSecureValue = async (key: string, value: string): Promise<void> => {
  await SecureStore.setItemAsync(key, value);
};

const deleteSecureValue = async (key: string): Promise<void> => {
  await SecureStore.deleteItemAsync(key);
};

const getOrCreateInstallationId = async (): Promise<string> => {
  const existingId = await readSecureValue(INSTALLATION_ID_KEY);
  if (existingId !== null && existingId !== '') {
    return existingId;
  }

  const generatedId = uuidv4();
  await writeSecureValue(INSTALLATION_ID_KEY, generatedId);
  return generatedId;
};

const syncDeviceTokenWithServer = async ({
  accessToken,
  locale,
  nextToken,
}: {
  accessToken: string;
  locale: string;
  nextToken: string;
}): Promise<void> => {
  const platform = getFcmTransportPlatform();
  if (platform === null) {
    return;
  }

  const api = createMobileApiRequestService(accessToken);
  if (api === null) {
    return;
  }

  const installationId = await getOrCreateInstallationId();
  const previousToken = await readSecureValue(REGISTERED_FCM_TOKEN_KEY);

  if (previousToken === nextToken) {
    return;
  }

  if (previousToken === null || previousToken === '') {
    await api.reqAccountFCMDeviceCreate({
      fcm_token: nextToken,
      installation_id: installationId,
      platform,
    });
  } else {
    await api.reqAccountFCMDeviceUpdate({
      installation_id: installationId,
      new_fcm_token: nextToken,
      platform,
      previous_fcm_token: previousToken,
    });
  }

  await api.reqAccountFCMDeviceUpdateLocale({ locale });
  await writeSecureValue(REGISTERED_FCM_TOKEN_KEY, nextToken);
};

export const registerFcmDeviceForAccount = async ({
  accessToken,
  locale,
}: {
  accessToken: string | null;
  locale: string;
}): Promise<void> => {
  if (accessToken === null) {
    return;
  }

  const permission = await getFcmPermissionStatus();
  if (!permission.granted) {
    return;
  }

  const nextToken = await getFcmDeviceToken();
  if (nextToken === null) {
    return;
  }

  await syncDeviceTokenWithServer({
    accessToken,
    locale,
    nextToken,
  });
};

export const startFcmTokenRefreshSync = ({
  accessToken,
  locale,
}: {
  accessToken: string | null;
  locale: string;
}): void => {
  if (stopTokenRefreshSubscription !== null) {
    stopTokenRefreshSubscription();
  }

  if (accessToken === null) {
    stopTokenRefreshSubscription = null;
    return;
  }

  stopTokenRefreshSubscription = onFcmDeviceTokenRefresh((nextToken) => {
    void syncDeviceTokenWithServer({ accessToken, locale, nextToken }).catch((error) => {
      console.warn('Failed to sync refreshed FCM token to account', error);
    });
  });
};

export const stopFcmTokenRefreshSync = (): void => {
  if (stopTokenRefreshSubscription === null) {
    return;
  }

  stopTokenRefreshSubscription();
  stopTokenRefreshSubscription = null;
};

export const unregisterFcmDeviceForAccount = async ({
  accessToken,
}: {
  accessToken: string | null;
}): Promise<void> => {
  if (accessToken === null) {
    await deleteSecureValue(REGISTERED_FCM_TOKEN_KEY);
    return;
  }

  const api = createMobileApiRequestService(accessToken);
  if (api === null) {
    return;
  }

  const [installationId, fcmToken] = await Promise.all([
    readSecureValue(INSTALLATION_ID_KEY),
    readSecureValue(REGISTERED_FCM_TOKEN_KEY),
  ]);

  await api.reqAccountFCMDeviceDelete({
    fcm_token: fcmToken,
    installation_id: installationId,
  });
  await deleteSecureValue(REGISTERED_FCM_TOKEN_KEY);
};

export const syncFcmDeviceLocaleIfRegistered = async ({
  accessToken,
  locale,
}: {
  accessToken: string | null;
  locale: string;
}): Promise<void> => {
  if (accessToken === null) {
    return;
  }

  const registeredToken = await readSecureValue(REGISTERED_FCM_TOKEN_KEY);
  if (registeredToken === null || registeredToken === '') {
    return;
  }

  const api = createMobileApiRequestService(accessToken);
  if (api === null) {
    return;
  }

  await api.reqAccountFCMDeviceUpdateLocale({ locale });
};
