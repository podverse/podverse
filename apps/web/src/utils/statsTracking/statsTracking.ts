import type { DTOAccount } from '@podverse/helpers';
import { isTasteProfileTrackingAllowed } from '@podverse/helpers';
import type { StatsListenRequestBody } from '@podverse/helpers-requests';
import { reqStatsListen, reqStatsOpen } from '@podverse/helpers-requests';

import { getApiRequestService } from '../../factories/apiRequestService';
import type { ListenSessionReport, ListenSessionTracker } from '../../lib/playback';
import { createListenSessionTracker } from '../../lib/playback';

let accountForListenStatsGate: DTOAccount | null = null;
let currentTasteProfileAgreementVersion = '';

export function syncListenStatsGateFromAccount(account: DTOAccount | null): void {
  accountForListenStatsGate = account;
}

export function syncTasteProfileAgreementVersion(version: string): void {
  currentTasteProfileAgreementVersion = version;
}

/** True when a signed-in account's Taste Profile consent allows reports. */
function canSendStatsReports(): boolean {
  if (accountForListenStatsGate === null) {
    return false;
  }
  return isTasteProfileTrackingAllowed(
    accountForListenStatsGate.account_settings,
    currentTasteProfileAgreementVersion
  );
}

/** Random v4 uuid; works outside secure contexts, where `crypto.randomUUID` is missing. */
export function createClientListenId(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Sends one listen report. Failures are ignored; the session's next report repeats its state. */
export function reportListen(report: ListenSessionReport): void {
  if (!canSendStatsReports()) {
    return;
  }
  const mediaDurationSeconds = report.mediaDurationSeconds;
  const body: StatsListenRequestBody = {
    client_listen_id: report.clientListenId,
    seconds_heard: report.secondsHeard,
    completed: report.completed,
    ...(mediaDurationSeconds !== null &&
    Number.isFinite(mediaDurationSeconds) &&
    mediaDurationSeconds > 0
      ? { media_duration_seconds: mediaDurationSeconds }
      : {}),
    ...(report.target.kind === 'clip'
      ? { clip_id_text: report.target.idText }
      : { item_id_text: report.target.idText }),
  };
  void reqStatsListen(getApiRequestService(), body).catch(() => {});
}

/** The page's listen session, shared by every mounted media orchestrator. */
export const webListenSession: ListenSessionTracker = createListenSessionTracker({
  now: () => Date.now(),
  createClientListenId,
  onReport: reportListen,
});

export function trackStatsProfileOpen(
  viewerAccountId: number | null | undefined,
  viewedAccountId: number,
  accountIdText: string
): void {
  if (viewerAccountId === undefined || viewerAccountId === null) {
    return;
  }
  if (viewerAccountId === viewedAccountId || !canSendStatsReports()) {
    return;
  }
  void reqStatsOpen(getApiRequestService(), { account_id_text: accountIdText }).catch(() => {});
}

export function trackStatsPlaylistOpen(playlistIdText: string): void {
  if (!canSendStatsReports()) {
    return;
  }
  void reqStatsOpen(getApiRequestService(), { playlist_id_text: playlistIdText }).catch(() => {});
}
