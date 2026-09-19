import { useMemo } from 'react';

import { useConnectivity } from '../net/connectivity';
import { useOfflineMode } from './offlineMode';

/**
 * The combined offline picture: what the user asked for, and what the network is doing.
 *
 * Separate from `offlineMode.ts` because this is the only part of the offline surface that needs
 * the platform. `offlineMode.ts` is reached by `syncErrorClassification.ts` and through it by the
 * node-tested sync modules, so it has to stay free of React Native imports.
 */

export type OfflineCause = 'device_offline' | 'forced' | 'server_unreachable';

export type OfflineStatus = {
  /** Why the app is offline, for copy selection. Null when online. */
  cause: OfflineCause | null;
  /** The user's toggle. The only one of these that may steer tabs or sections. */
  isForced: boolean;
  /** Forced or derived. Drives fallback copy, never navigation. */
  isOffline: boolean;
};

/**
 * Read this for anything that explains the state to a person.
 *
 * `isForced` wins the cause when both apply: a deliberate choice is the more useful explanation of
 * the two, and it is the one the user can undo from More.
 *
 * The hard network gates stay on `isOfflineModeEnabled()`. A weak signal is not a reason to refuse
 * a tap that might still work, and only the user's own choice may steer a screen's tab or section.
 */
export const useOfflineStatus = (): OfflineStatus => {
  const { enabled: isForced } = useOfflineMode();
  const connectivity = useConnectivity();

  return useMemo(() => {
    if (isForced) {
      return { cause: 'forced', isForced: true, isOffline: true };
    }
    if (connectivity === 'online') {
      return { cause: null, isForced: false, isOffline: false };
    }
    return { cause: connectivity, isForced: false, isOffline: true };
  }, [connectivity, isForced]);
};
