import * as SecureStore from 'expo-secure-store';

import type { AuthRequestDeps } from '../auth/authRequestWithRefresh';
import { requestWithMobileAuthRefreshIfSignedIn } from '../auth/authRequestWithRefresh';
import { createMobileApiRequestService } from '../auth/mobileApi';
import {
  getFcmDeviceToken,
  getFcmPermissionStatus,
  getFcmTransportPlatform,
  onFcmDeviceTokenRefresh,
} from './fcmTransport';
import { getOrCreateInstallationId, readInstallationId } from './installationId';

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

const syncDeviceTokenWithServer = async ({
  auth,
  locale,
  nextToken,
}: {
  auth: AuthRequestDeps;
  locale: string;
  nextToken: string;
}): Promise<void> => {
  if (auth.accessToken === null) {
    return;
  }

  const platform = getFcmTransportPlatform();
  if (platform === null) {
    return;
  }

  const installationId = await getOrCreateInstallationId();
  const previousToken = await readSecureValue(REGISTERED_FCM_TOKEN_KEY);

  if (previousToken === nextToken) {
    return;
  }

  const registered =
    previousToken === null || previousToken === ''
      ? await requestWithMobileAuthRefreshIfSignedIn(auth, (api) =>
          api.reqAccountFCMDeviceCreate({
            fcm_token: nextToken,
            installation_id: installationId,
            platform,
          })
        )
      : await requestWithMobileAuthRefreshIfSignedIn(auth, (api) =>
          api.reqAccountFCMDeviceUpdate({
            installation_id: installationId,
            new_fcm_token: nextToken,
            platform,
            previous_fcm_token: previousToken,
          })
        );
  if (registered === null) {
    return;
  }

  const localeUpdated = await requestWithMobileAuthRefreshIfSignedIn(auth, (api) =>
    api.reqAccountFCMDeviceUpdateLocale({ locale })
  );
  if (localeUpdated === null) {
    return;
  }
  await writeSecureValue(REGISTERED_FCM_TOKEN_KEY, nextToken);
};

export const registerFcmDeviceForAccount = async ({
  auth,
  locale,
}: {
  auth: AuthRequestDeps;
  locale: string;
}): Promise<void> => {
  if (auth.accessToken === null) {
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
    auth,
    locale,
    nextToken,
  });
};

export const startFcmTokenRefreshSync = ({
  auth,
  locale,
}: {
  auth: AuthRequestDeps;
  locale: string;
}): void => {
  if (stopTokenRefreshSubscription !== null) {
    stopTokenRefreshSubscription();
  }

  if (auth.accessToken === null) {
    stopTokenRefreshSubscription = null;
    return;
  }

  stopTokenRefreshSubscription = onFcmDeviceTokenRefresh((nextToken) => {
    void syncDeviceTokenWithServer({ auth, locale, nextToken }).catch((error: unknown) => {
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
    readInstallationId(),
    readSecureValue(REGISTERED_FCM_TOKEN_KEY),
  ]);

  const hasInstallationId = installationId !== null && installationId !== '';
  const hasFcmToken = fcmToken !== null && fcmToken !== '';
  if (hasInstallationId || hasFcmToken) {
    await api.reqAccountFCMDeviceDelete({
      fcm_token: fcmToken,
      installation_id: installationId,
    });
  }
  await deleteSecureValue(REGISTERED_FCM_TOKEN_KEY);
};

export const syncFcmDeviceLocaleIfRegistered = async ({
  auth,
  locale,
}: {
  auth: AuthRequestDeps;
  locale: string;
}): Promise<void> => {
  if (auth.accessToken === null) {
    return;
  }

  const registeredToken = await readSecureValue(REGISTERED_FCM_TOKEN_KEY);
  if (registeredToken === null || registeredToken === '') {
    return;
  }

  await requestWithMobileAuthRefreshIfSignedIn(auth, (api) =>
    api.reqAccountFCMDeviceUpdateLocale({ locale })
  );
};
