import { getApiRequestService } from '../../factories/apiRequestService';

function fireStatsRequest(promise: Promise<unknown>): void {
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
  fireStatsRequest(getApiRequestService().reqStatsTrackAccount(accountIdText));
}

export function trackStatsChannel(channelIdText: string): void {
  fireStatsRequest(getApiRequestService().reqStatsTrackChannel(channelIdText));
}

export function trackStatsClip(clipIdText: string): void {
  fireStatsRequest(getApiRequestService().reqStatsTrackClip(clipIdText));
}

export function trackStatsItem(itemIdText: string): void {
  fireStatsRequest(getApiRequestService().reqStatsTrackItem(itemIdText));
}

export function trackStatsPlaylist(playlistIdText: string): void {
  fireStatsRequest(getApiRequestService().reqStatsTrackPlaylist(playlistIdText));
}
