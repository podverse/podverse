import { AppState } from 'react-native';

import { deriveMembershipState, evaluateFeatureAccess } from '@podverse/helpers';

import { createBackgroundAuthDeps } from '../auth/backgroundAuthDeps';
import { accountRepository } from '../data/repositories/accountRepository';
import { autoDownloadRepository } from '../data/repositories/autoDownloadRepository';
import { channelItemsRepository } from '../data/repositories/channelItemsRepository';
import { syncDirectoryChannelOrDropGone } from '../data/repositories/directoryChannelGone';
import { runAutoDownloadEvaluate } from './autoDownloadEvaluate';

/** Stale directory refreshes per background-fetch wake. The foreground queue does the rest. */
const BACKGROUND_REFRESH_CAP = 5;

/**
 * Refresh a small set of directory channels, then evaluate. A silent push refreshes only the
 * named channel and enqueues only the named items. A periodic fetch refreshes a few stale
 * windows and runs one capped catch-up. Skipped when the app is already in the foreground,
 * because that visit's sync owns the catch-up.
 */
export const runAutoDownloadBackgroundPass = async (params?: {
  channelIdTexts?: readonly string[];
  pushItemIdTexts?: ReadonlySet<string>;
}): Promise<void> => {
  const isPush = params?.pushItemIdTexts !== undefined && params.pushItemIdTexts.size > 0;
  if (!isPush && AppState.currentState === 'active') {
    return;
  }

  const account = await accountRepository.getSnapshot();
  const membershipAllows =
    account !== null &&
    evaluateFeatureAccess('auto_download', deriveMembershipState(account)).allowed;
  if (!membershipAllows) {
    return;
  }

  const enabled = await autoDownloadRepository.listEnabled();
  const directory = enabled.filter((row) => row.source === 'directory');
  const named = params?.channelIdTexts;

  let refreshIds: string[];
  if (named !== undefined && named.length > 0) {
    const namedSet = new Set(named);
    refreshIds = directory
      .filter((row) => namedSet.has(row.channelIdText))
      .map((row) => row.channelIdText);
  } else {
    const stale = await channelItemsRepository.selectStaleChannels(
      directory.map((row) => row.channelIdText)
    );
    refreshIds = stale.slice(0, BACKGROUND_REFRESH_CAP).map((window) => window.channelIdText);
  }

  const auth = await createBackgroundAuthDeps();
  if (auth !== null) {
    for (const channelIdText of refreshIds) {
      try {
        await syncDirectoryChannelOrDropGone(auth, channelIdText);
      } catch (error: unknown) {
        console.warn(
          `[auto-download] background channel refresh failed for ${channelIdText}`,
          error
        );
      }
    }
  }

  if (isPush && params?.pushItemIdTexts !== undefined) {
    await runAutoDownloadEvaluate({
      ...(named !== undefined ? { channelIdTexts: named } : {}),
      membershipAllows: true,
      mode: 'incremental',
      pushItemIdTexts: params.pushItemIdTexts,
    });
    return;
  }

  await runAutoDownloadEvaluate({
    membershipAllows: true,
    mode: 'catch_up',
  });
};
