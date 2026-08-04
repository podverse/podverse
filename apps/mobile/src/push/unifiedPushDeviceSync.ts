import * as SecureStore from 'expo-secure-store';

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
  accessToken,
  locale,
}: {
  accessToken: string | null;
  locale: string;
}): Promise<void> => {
  if (accessToken === null) {
    return;
  }

  const payload = getUnifiedPushRegistrationPayload();
  if (payload === null) {
    return;
  }

  const api = createMobileApiRequestService(accessToken);
  if (api === null) {
    return;
  }

  const previousEndpoint = await readSecureValue(REGISTERED_UP_ENDPOINT_KEY);
  if (previousEndpoint === null || previousEndpoint === '') {
    await api.reqAccountUPDeviceCreate(payload);
  } else {
    await api.reqAccountUPDeviceUpdate(payload);
  }

  await api.reqAccountUPDeviceUpdateLocale({ locale });
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
  accessToken,
  locale,
}: {
  accessToken: string | null;
  locale: string;
}): Promise<void> => {
  if (accessToken === null) {
    return;
  }

  const registeredEndpoint = await readSecureValue(REGISTERED_UP_ENDPOINT_KEY);
  if (registeredEndpoint === null || registeredEndpoint === '') {
    return;
  }

  const api = createMobileApiRequestService(accessToken);
  if (api === null) {
    return;
  }

  await api.reqAccountUPDeviceUpdateLocale({ locale });
};
