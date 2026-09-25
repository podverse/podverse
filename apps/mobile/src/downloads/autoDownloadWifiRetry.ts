import NetInfo from '@react-native-community/netinfo';

import { runAutoDownloadEvaluate } from './autoDownloadEvaluate';
import { autoDownloadNetworkFromNetInfoType } from './autoDownloadPlanner';

/**
 * When Wi‑Fi (or ethernet) returns, re-run evaluate so `pending` candidates blocked by cellular
 * can enqueue. Debounced so NetInfo flaps do not stampede the queue.
 */

let unsubscribe: (() => void) | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastNetwork: string | null = null;

const DEBOUNCE_MS = 1500;

const scheduleEvaluate = (): void => {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void runAutoDownloadEvaluate({ mode: 'retry_pending' }).catch((error: unknown) => {
      if (__DEV__) {
        console.warn('[auto-download] wifi retry evaluate failed', error);
      }
    });
  }, DEBOUNCE_MS);
};

export const startAutoDownloadWifiRetryListener = (): void => {
  if (unsubscribe !== null) {
    return;
  }

  unsubscribe = NetInfo.addEventListener((state) => {
    const network = autoDownloadNetworkFromNetInfoType(state.type, state.isConnected);
    const previous = lastNetwork;
    lastNetwork = network;
    if (network === 'wifi' && previous !== null && previous !== 'wifi') {
      scheduleEvaluate();
    }
  });
};

export const stopAutoDownloadWifiRetryListener = (): void => {
  if (unsubscribe !== null) {
    unsubscribe();
    unsubscribe = null;
  }
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
};
