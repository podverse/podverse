import AsyncStorage from '@react-native-async-storage/async-storage';

import { deriveMembershipState, evaluateFeatureAccess } from '@podverse/helpers';

import type { AuthRequestDeps } from '../auth/authRequestWithRefresh';
import { requestWithMobileAuthRefreshIfSignedIn } from '../auth/authRequestWithRefresh';
import { accountRepository } from '../data/repositories/accountRepository';
import { autoDownloadRepository } from '../data/repositories/autoDownloadRepository';
import { getOrCreateInstallationId } from '../push/installationId';

const LAST_HASH_KEY = 'autoDownload.registrationHash';

const hashChannelSet = (channelIdTexts: readonly string[]): string => {
  return [...channelIdTexts].sort().join('\n');
};

/**
 * Mirror the device's enabled auto-download channels to the server for this installation.
 * Sends only when the set changed (or force). Clears the server set when membership is lost.
 */
export const runAutoDownloadRegistration = async (params: {
  auth: AuthRequestDeps;
  force?: boolean;
}): Promise<void> => {
  if (params.auth.accessToken === null) {
    return;
  }

  const account = await accountRepository.getSnapshot();
  const membershipAllows =
    account !== null &&
    evaluateFeatureAccess('auto_download', deriveMembershipState(account)).allowed;

  const installationId = await getOrCreateInstallationId();
  const enabled = membershipAllows ? await autoDownloadRepository.listEnabled() : [];
  const channelIdTexts = enabled
    .filter((row) => row.source === 'directory')
    .map((row) => row.channelIdText);
  const nextHash = membershipAllows ? hashChannelSet(channelIdTexts) : '';

  if (!params.force) {
    const previousHash = await AsyncStorage.getItem(LAST_HASH_KEY);
    if (previousHash === nextHash) {
      return;
    }
  }

  const result = await requestWithMobileAuthRefreshIfSignedIn(params.auth, (api) =>
    api.reqAccountAutoDownloadChannelsPut({
      channel_id_texts: channelIdTexts,
      installation_id: installationId,
    })
  );
  if (result === null) {
    return;
  }

  await AsyncStorage.setItem(LAST_HASH_KEY, nextHash);
};

/** Drop the cached registration hash so the next sync re-sends (e.g. after sign-out). */
export const clearAutoDownloadRegistrationCache = async (): Promise<void> => {
  await AsyncStorage.removeItem(LAST_HASH_KEY);
};
