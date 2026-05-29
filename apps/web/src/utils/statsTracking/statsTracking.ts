import type { DTOAccount } from '@podverse/helpers';
import {
  reqStatsTrackAccount,
  reqStatsTrackChannel,
  reqStatsTrackClip,
  reqStatsTrackItem,
  reqStatsTrackPlaylist,
} from '@podverse/helpers-requests';

import { getApiRequestService } from '../../factories/apiRequestService';

let accountForListenStatsGate: DTOAccount | null = null;

export function syncListenStatsGateFromAccount(account: DTOAccount | null): void {
  accountForListenStatsGate = account;
}

function shouldSkipListenStatsForLoggedInAccount(): boolean {
  if (accountForListenStatsGate === null) {
    return false;
  }
  return accountForListenStatsGate.account_settings?.allow_listen_stats === false;
}

function fireStatsRequest(promise: Promise<unknown>): void {
  if (shouldSkipListenStatsForLoggedInAccount()) {
    return;
  }
  void promise.catch(() => {});
}

/**
 * Stats POSTs are idempotent server-side (one row per viewer per entity).
 * Failures are ignored so tracking never blocks UX.
 */

export function trackStatsAccountVisit(
  viewerAccountId: number | null | undefined,
  viewedAccountId: number,
  accountIdText: string
): void {
  if (viewerAccountId === undefined || viewerAccountId === null) {
    return;
  }
  if (viewerAccountId === viewedAccountId) {
    return;
  }
  const api = getApiRequestService();
  fireStatsRequest(reqStatsTrackAccount(api, accountIdText));
}

export function trackStatsChannel(channelIdText: string): void {
  const api = getApiRequestService();
  fireStatsRequest(reqStatsTrackChannel(api, channelIdText));
}

export function trackStatsClip(clipIdText: string): void {
  const api = getApiRequestService();
  fireStatsRequest(reqStatsTrackClip(api, clipIdText));
}

export function trackStatsItem(itemIdText: string): void {
  const api = getApiRequestService();
  fireStatsRequest(reqStatsTrackItem(api, itemIdText));
}

export function trackStatsPlaylist(playlistIdText: string): void {
  const api = getApiRequestService();
  fireStatsRequest(reqStatsTrackPlaylist(api, playlistIdText));
}
