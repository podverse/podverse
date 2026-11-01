import { getApiRequestService } from '../../factories/apiRequestService';
import { clearAddByRSSCredentialsForSignOut } from '../../utils/addByRSS/credentialStore';
import { moveBrowserAfterSignOut } from './pendingSettingsNavigation';

/** Clears this browser's Add by RSS credentials for the account, ends the session, and reloads. */
export async function signOutThisBrowser(accountIdText: string | null | undefined): Promise<void> {
  await clearAddByRSSCredentialsForSignOut(accountIdText);
  try {
    await getApiRequestService().reqAuthLogout();
  } catch {
    // The cookie may already be gone.
  }
  moveBrowserAfterSignOut();
}
