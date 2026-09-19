import AsyncStorage from '@react-native-async-storage/async-storage';

import { getMobileConfig } from '../config';

const E2E_STORAGE_MARKER_KEY = 'e2e.storage_marker';

/**
 * Whether this boot must drop a session an earlier E2E flow left behind.
 *
 * Maestro's `clearState` wipes the app's own storage but not expo-secure-store (iOS Keychain,
 * Android keystore-backed prefs), so a previous flow's login otherwise survives and the next flow
 * boots straight into the authenticated shell. The marker lives in the storage `clearState` does
 * wipe, which is what separates the two kinds of launch: absent means the app's data is gone and
 * any surviving tokens belong to a finished flow, present means the process was relaunched with its
 * data intact and the session belongs to the flow in progress. A flow that relaunches to exercise a
 * foreground path therefore stays signed in, exactly as a real relaunch would.
 *
 * The `__DEV__` guard guarantees none of this can run in a release build even if the E2E flag is
 * somehow set.
 */
export const shouldResetLeakedE2eSession = async (): Promise<boolean> => {
  if (!__DEV__ || !getMobileConfig().isE2e) {
    return false;
  }

  const marker = await AsyncStorage.getItem(E2E_STORAGE_MARKER_KEY);
  await AsyncStorage.setItem(E2E_STORAGE_MARKER_KEY, 'seen');
  return marker === null;
};
