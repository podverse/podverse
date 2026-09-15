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
/**
 * Bumped on every write so an in-flight disk hydrate cannot overwrite a newer in-memory value.
 * Disk is a seed; writes always win.
 */
let writeGeneration = 0;
let hydratePromise: Promise<boolean> | null = null;
let hasSeededFromDisk = false;

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
export const isSyncNetworkUsable = (netReachable: boolean, offlineModeEnabled: boolean): boolean =>
  netReachable && !offlineModeEnabled;

/**
 * Read Offline Mode from disk into the in-memory mirror. Prefer `hydrateOfflineMode` from app
 * boot and React subscribers — that path is write-aware. This helper is for callers that need a
 * fresh disk read and accept overwriting the cache (e.g. tests).
 */
export const readOfflineModeEnabled = async (): Promise<boolean> => {
  const value = await getPref('offline.mode');
  cachedEnabled = value ?? DEFAULT_OFFLINE_MODE;
  return cachedEnabled;
};

/**
 * Load the durable pref into the in-memory mirror. Idempotent; safe to call from app boot and from
 * the first subscriber before any write. Always resolves to the live cache — never a boolean
 * captured when the first disk read started — so a write during hydrate wins.
 */
export const hydrateOfflineMode = async (): Promise<boolean> => {
  if (hasSeededFromDisk) {
    return cachedEnabled;
  }

  if (hydratePromise === null) {
    const generationAtStart = writeGeneration;
    hydratePromise = (async () => {
      const value = await getPref('offline.mode');
      // A write during the await owns the cache; disk must not stomp it.
      if (writeGeneration === generationAtStart) {
        cachedEnabled = value ?? DEFAULT_OFFLINE_MODE;
      }
      hasSeededFromDisk = true;
      return cachedEnabled;
    })().catch((error: unknown) => {
      hydratePromise = null;
      throw error;
    });
  }

  // Await the shared seed, then return whatever is live now (may have been written after seed).
  await hydratePromise;
  return cachedEnabled;
};

export const writeOfflineModeEnabled = async (enabled: boolean): Promise<void> => {
  await setPref('offline.mode', enabled);
  writeGeneration += 1;
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
    const unsubscribe = subscribeOfflineMode((next) => {
      setEnabledState(next);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const setEnabled = useCallback(async (next: boolean) => {
    await writeOfflineModeEnabled(next);
  }, []);

  return { enabled, setEnabled };
};
