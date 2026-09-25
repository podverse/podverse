import * as SecureStore from 'expo-secure-store';

import { createUuid } from '../lib/createUuid';

const INSTALLATION_ID_KEY = 'push.installationId';

/**
 * Stable per-install id shared by FCM device registration and auto-download channel registration.
 */
export const getOrCreateInstallationId = async (): Promise<string> => {
  const existingId = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
  if (existingId !== null && existingId !== '') {
    return existingId;
  }

  const generatedId = createUuid();
  await SecureStore.setItemAsync(INSTALLATION_ID_KEY, generatedId);
  return generatedId;
};

export const readInstallationId = async (): Promise<string | null> => {
  return SecureStore.getItemAsync(INSTALLATION_ID_KEY);
};
