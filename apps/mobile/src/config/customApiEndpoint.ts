import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { acceptStoredCustomApiBaseUrl } from './customApiUrl';
import { selectMobileApiBaseUrl } from './env';

/**
 * Device-local API override. It survives logout on purpose: the session for the previous server
 * ends before this address is saved, and the next sign-in uses that address.
 * Account cleanup must not delete this key.
 */
const STORAGE_KEY = 'api.custom_base_url';

type Listener = (baseUrl: string | null) => void;

const listeners = new Set<Listener>();

let cached: string | null = null;
let writeGeneration = 0;
let hydratePromise: Promise<string | null> | null = null;
let hasSeededFromDisk = false;

const notify = (): void => {
  for (const listener of listeners) {
    listener(cached);
  }
};

const builtInBaseUrl = (): string | null => selectMobileApiBaseUrl().value;

const remember = (baseUrl: string | null): void => {
  cached = baseUrl;
  notify();
};

/** Sync read of the override that `getMobileConfig()` applies. Null means the build's API address. */
export const readCustomApiBaseUrlOverride = (): string | null => cached;

export const subscribeCustomApiBaseUrl = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Load the override before any request. A value that is not a usable API address, or that matches
 * the build's address, is dropped so a bad save cannot replace the original endpoint.
 */
export const hydrateCustomApiEndpoint = async (): Promise<string | null> => {
  if (hasSeededFromDisk) {
    return cached;
  }

  if (hydratePromise === null) {
    const generationAtStart = writeGeneration;
    hydratePromise = (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const accepted = acceptStoredCustomApiBaseUrl(raw, builtInBaseUrl());
      if (writeGeneration === generationAtStart) {
        cached = accepted;
      }
      if (raw !== null && raw !== accepted) {
        if (accepted === null) {
          await AsyncStorage.removeItem(STORAGE_KEY);
        } else {
          await AsyncStorage.setItem(STORAGE_KEY, accepted);
        }
      }
      hasSeededFromDisk = true;
      notify();
      return cached;
    })().catch((error: unknown) => {
      hydratePromise = null;
      throw error;
    });
  }

  await hydratePromise;
  return cached;
};

/** Persist `null` to restore the build's API address. */
export const writeCustomApiBaseUrl = async (baseUrl: string | null): Promise<void> => {
  const accepted = acceptStoredCustomApiBaseUrl(baseUrl, builtInBaseUrl());
  writeGeneration += 1;
  if (accepted === null) {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } else {
    await AsyncStorage.setItem(STORAGE_KEY, accepted);
  }
  hasSeededFromDisk = true;
  remember(accepted);
};

export const useCustomApiBaseUrl = (): string | null => {
  return useSyncExternalStore(
    subscribeCustomApiBaseUrl,
    readCustomApiBaseUrlOverride,
    readCustomApiBaseUrlOverride
  );
};
