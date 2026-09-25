import { requestWithMobileAuthRefreshIfSignedIn } from '../auth/authRequestWithRefresh';
import { createBackgroundAuthDeps } from '../auth/backgroundAuthDeps';
import { getOrCreateInstallationId } from '../push/installationId';
import {
  clearAutoDownloadRegistrationCache,
  runAutoDownloadRegistration,
} from './autoDownloadRegistration';

/**
 * Push the current enabled auto-download set to the server when local settings change.
 * No-ops when signed out or when the hash is unchanged.
 */
export const syncAutoDownloadRegistrationNow = async (): Promise<void> => {
  try {
    const auth = await createBackgroundAuthDeps();
    if (auth === null) {
      return;
    }
    await runAutoDownloadRegistration({ auth });
  } catch (error: unknown) {
    console.warn('[auto-download] registration sync failed', error);
  }
};

/**
 * Clear the server mirror and local hash on sign-out so a later account does not inherit this
 * device's wake registrations.
 */
export const clearAutoDownloadRegistrationOnSignOut = async (
  accessToken: string | null
): Promise<void> => {
  try {
    if (accessToken !== null) {
      const auth = await createBackgroundAuthDeps();
      if (auth !== null) {
        const installationId = await getOrCreateInstallationId();
        await requestWithMobileAuthRefreshIfSignedIn(auth, (api) =>
          api.reqAccountAutoDownloadChannelsPut({
            channel_id_texts: [],
            installation_id: installationId,
          })
        );
      }
    }
  } catch (error: unknown) {
    console.warn('[auto-download] failed to clear registration on sign-out', error);
  } finally {
    await clearAutoDownloadRegistrationCache();
  }
};
