import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { probeCustomApiBaseUrl } from './customApiProbe';
import { acceptStoredCustomApiBaseUrl, normalizePublicWebOrigin } from './customApiUrl';
import { selectMobileApiBaseUrl } from './env';

/**
 * Device-local API override. It survives logout on purpose: the session for the previous server
 * ends before this address is saved, and the next sign-in uses that address.
 * Account cleanup must not delete these keys.
 */
const BASE_URL_KEY = 'api.custom_base_url';
const WEB_ORIGIN_KEY = 'api.custom_web_origin';

type Listener = (baseUrl: string | null) => void;

const listeners = new Set<Listener>();

let cached: string | null = null;
let cachedOrigin: string | null = null;
let writeGeneration = 0;
let writeQueue: Promise<void> = Promise.resolve();
let hydratePromise: Promise<string | null> | null = null;
let hasSeededFromDisk = false;

const notify = (): void => {
  for (const listener of listeners) {
    listener(cached);
  }
};

const builtInBaseUrl = (): string | null => selectMobileApiBaseUrl().value;

const remember = (baseUrl: string | null, webOrigin: string | null): void => {
  cached = baseUrl;
  cachedOrigin = baseUrl === null ? null : webOrigin;
  notify();
};

const enqueueWrite = (task: () => Promise<void>): Promise<void> => {
  const run = writeQueue.then(task, task);
  writeQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
};

const persistBaseUrl = async (baseUrl: string | null): Promise<void> => {
  if (baseUrl === null) {
    await AsyncStorage.removeItem(BASE_URL_KEY);
    return;
  }
  await AsyncStorage.setItem(BASE_URL_KEY, baseUrl);
};

const persistWebOrigin = async (webOrigin: string | null): Promise<void> => {
  if (webOrigin === null) {
    await AsyncStorage.removeItem(WEB_ORIGIN_KEY);
    return;
  }
  await AsyncStorage.setItem(WEB_ORIGIN_KEY, webOrigin);
};

/** Sync read of the override that `getMobileConfig()` applies. Null means the build's API address. */
export const readCustomApiBaseUrlOverride = (): string | null => cached;

/** Website origin stored with the custom API. Null when no override is saved or none was reported. */
export const readCustomApiWebOrigin = (): string | null => {
  if (cached === null) {
    return null;
  }
  return cachedOrigin;
};

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
      const raw = await AsyncStorage.getItem(BASE_URL_KEY);
      const rawOrigin = await AsyncStorage.getItem(WEB_ORIGIN_KEY);
      const accepted = acceptStoredCustomApiBaseUrl(raw, builtInBaseUrl());
      const acceptedOrigin = accepted === null ? null : normalizePublicWebOrigin(rawOrigin);
      if (writeGeneration === generationAtStart) {
        cached = accepted;
        cachedOrigin = acceptedOrigin;
      }
      if (raw !== null && raw !== accepted) {
        if (accepted === null) {
          await AsyncStorage.removeItem(BASE_URL_KEY);
        } else {
          await AsyncStorage.setItem(BASE_URL_KEY, accepted);
        }
      }
      if (accepted === null) {
        if (rawOrigin !== null) {
          await AsyncStorage.removeItem(WEB_ORIGIN_KEY);
        }
      } else if (rawOrigin !== acceptedOrigin) {
        if (acceptedOrigin === null) {
          await AsyncStorage.removeItem(WEB_ORIGIN_KEY);
        } else {
          await AsyncStorage.setItem(WEB_ORIGIN_KEY, acceptedOrigin);
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

/**
 * Persist `null` to restore the build's API address and drop the stored website origin.
 * A saved address stores `webOrigin` beside it. Writes are ordered so a later save wins over
 * an in-flight refresh.
 */
export const writeCustomApiBaseUrl = async (
  baseUrl: string | null,
  webOrigin: string | null = null
): Promise<void> => {
  await enqueueWrite(async () => {
    writeGeneration += 1;
    const accepted = acceptStoredCustomApiBaseUrl(baseUrl, builtInBaseUrl());
    const acceptedOrigin = accepted === null ? null : normalizePublicWebOrigin(webOrigin);
    await persistBaseUrl(accepted);
    await persistWebOrigin(acceptedOrigin);
    hasSeededFromDisk = true;
    remember(accepted, acceptedOrigin);
  });
};

/**
 * Re-read the saved server's website origin. A failed request keeps the stored value.
 * A save that landed while this request was in flight is left as that save wrote it.
 */
export const refreshSavedCustomApiWebOrigin = async (): Promise<void> => {
  const baseUrl = readCustomApiBaseUrlOverride();
  if (baseUrl === null) {
    return;
  }

  const generationAtStart = writeGeneration;
  let reported: string | null;
  try {
    const result = await probeCustomApiBaseUrl(baseUrl);
    if (!result.ok || result.baseUrl !== baseUrl) {
      return;
    }
    reported = result.webOrigin;
  } catch {
    return;
  }

  await enqueueWrite(async () => {
    if (writeGeneration !== generationAtStart || cached !== baseUrl) {
      return;
    }
    const acceptedOrigin = normalizePublicWebOrigin(reported);
    await persistWebOrigin(acceptedOrigin);
    if (writeGeneration !== generationAtStart || cached !== baseUrl) {
      return;
    }
    cachedOrigin = acceptedOrigin;
    notify();
  });
};

export const useCustomApiBaseUrl = (): string | null => {
  return useSyncExternalStore(
    subscribeCustomApiBaseUrl,
    readCustomApiBaseUrlOverride,
    readCustomApiBaseUrlOverride
  );
};

export const useCustomApiWebOrigin = (): string | null => {
  return useSyncExternalStore(
    subscribeCustomApiBaseUrl,
    readCustomApiWebOrigin,
    readCustomApiWebOrigin
  );
};
