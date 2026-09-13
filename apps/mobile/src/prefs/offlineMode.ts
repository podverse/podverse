import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_OFFLINE_MODE, getPref, setPref } from './prefsStore';

/**
 * Device-local Offline Mode. When on, the app parks all network work and screens default to
 * downloaded / already-stored views. Distinct from NetInfo reachability — the user flips this
 * switch; the device coming and going does not.
 */

type Listener = (enabled: boolean) => void;

const listeners = new Set<Listener>();

/** In-memory mirror so request/download/playback gates can refuse without an AsyncStorage round-trip. */
let cachedEnabled = DEFAULT_OFFLINE_MODE;
let hydratePromise: Promise<boolean> | null = null;

const notify = (enabled: boolean): void => {
  for (const listener of listeners) {
    listener(enabled);
  }
};

/** Sync read of the last known value. Callers that need the durable value should await hydrate. */
export const isOfflineModeEnabled = (): boolean => cachedEnabled;

/**
 * Sync queue is usable only when the platform reports reachability **and** Offline Mode is off.
 * Turning Offline Mode on parks the queue the same way as a real outage.
 */
export const isSyncNetworkUsable = (
  netReachable: boolean,
  offlineModeEnabled: boolean
): boolean => netReachable && !offlineModeEnabled;

export const readOfflineModeEnabled = async (): Promise<boolean> => {
  const value = await getPref('offline.mode');
  cachedEnabled = value ?? DEFAULT_OFFLINE_MODE;
  return cachedEnabled;
};

/**
 * Load the durable pref into the in-memory mirror. Idempotent; safe to call from app boot and from
 * the first subscriber before any write.
 */
export const hydrateOfflineMode = async (): Promise<boolean> => {
  if (hydratePromise === null) {
    hydratePromise = readOfflineModeEnabled().catch((error: unknown) => {
      hydratePromise = null;
      throw error;
    });
  }
  return hydratePromise;
};

export const writeOfflineModeEnabled = async (enabled: boolean): Promise<void> => {
  await setPref('offline.mode', enabled);
  cachedEnabled = enabled;
  notify(enabled);
};

export const subscribeOfflineMode = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Thrown by API helpers when Offline Mode is on, so callers and `classifySyncError` treat it as
 * an offline state rather than a server fault. Never triggers a token refresh.
 */
export class OfflineModeEnabledError extends Error {
  readonly code = 'ERR_OFFLINE_MODE';

  constructor() {
    super('Offline Mode is on — network requests are parked');
    this.name = 'OfflineModeEnabledError';
  }
}

export type OfflineModeControls = {
  enabled: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
};

/** React subscription to Offline Mode. Hydrates on mount so the first paint matches disk. */
export const useOfflineMode = (): OfflineModeControls => {
  const [enabled, setEnabledState] = useState(cachedEnabled);

  useEffect(() => {
    let cancelled = false;
    void hydrateOfflineMode().then((value) => {
      if (!cancelled) {
        setEnabledState(value);
      }
    });
    return subscribeOfflineMode((next) => {
      setEnabledState(next);
    });
  }, []);

  const setEnabled = useCallback(async (next: boolean) => {
    await writeOfflineModeEnabled(next);
  }, []);

  return { enabled, setEnabled };
};
