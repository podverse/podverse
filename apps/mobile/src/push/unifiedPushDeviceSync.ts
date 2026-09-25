import * as SecureStore from 'expo-secure-store';

import type { AuthRequestDeps } from '../auth/authRequestWithRefresh';
import { requestWithMobileAuthRefreshIfSignedIn } from '../auth/authRequestWithRefresh';
import { createMobileApiRequestService } from '../auth/mobileApi';
import { getUnifiedPushRegistrationPayload } from './unifiedPushTransport';

const REGISTERED_UP_ENDPOINT_KEY = 'push.up.registeredEndpoint';

const readSecureValue = async (key: string): Promise<string | null> => {
  return SecureStore.getItemAsync(key);
};

const writeSecureValue = async (key: string, value: string): Promise<void> => {
  await SecureStore.setItemAsync(key, value);
};

const deleteSecureValue = async (key: string): Promise<void> => {
  await SecureStore.deleteItemAsync(key);
};

export const registerUnifiedPushDeviceForAccount = async ({
  auth,
  locale,
}: {
  auth: AuthRequestDeps;
  locale: string;
}): Promise<void> => {
  if (auth.accessToken === null) {
    return;
  }

  const payload = getUnifiedPushRegistrationPayload();
  if (payload === null) {
    return;
  }

  const previousEndpoint = await readSecureValue(REGISTERED_UP_ENDPOINT_KEY);
  const registered =
    previousEndpoint === null || previousEndpoint === ''
      ? await requestWithMobileAuthRefreshIfSignedIn(auth, (api) =>
          api.reqAccountUPDeviceCreate(payload)
        )
      : await requestWithMobileAuthRefreshIfSignedIn(auth, (api) =>
          api.reqAccountUPDeviceUpdate(payload)
        );
  if (registered === null) {
    return;
  }

  const localeUpdated = await requestWithMobileAuthRefreshIfSignedIn(auth, (api) =>
    api.reqAccountUPDeviceUpdateLocale({ locale })
  );
  if (localeUpdated === null) {
    return;
  }
  await writeSecureValue(REGISTERED_UP_ENDPOINT_KEY, payload.up_endpoint);
};

export const unregisterUnifiedPushDeviceForAccount = async ({
  accessToken,
}: {
  accessToken: string | null;
}): Promise<void> => {
  if (accessToken === null) {
    await deleteSecureValue(REGISTERED_UP_ENDPOINT_KEY);
    return;
  }

  const api = createMobileApiRequestService(accessToken);
  if (api === null) {
    return;
  }

  await api.reqAccountUPDeviceDeleteAll();
  await deleteSecureValue(REGISTERED_UP_ENDPOINT_KEY);
};

export const syncUnifiedPushDeviceLocaleIfRegistered = async ({
  auth,
  locale,
}: {
  auth: AuthRequestDeps;
  locale: string;
}): Promise<void> => {
  if (auth.accessToken === null) {
    return;
  }

  const registeredEndpoint = await readSecureValue(REGISTERED_UP_ENDPOINT_KEY);
  if (registeredEndpoint === null || registeredEndpoint === '') {
    return;
  }

  await requestWithMobileAuthRefreshIfSignedIn(auth, (api) =>
    api.reqAccountUPDeviceUpdateLocale({ locale })
  );
};
