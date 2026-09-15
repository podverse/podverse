import { toEpochMsOrNull } from './date.js';
import type { PlaybackZone } from './playbackEvents.js';

export const PLAYBACK_CLOCK_SKEW_ALLOWANCE_MS = 5 * 60 * 1000;

export type PlaybackStateMergeInput = {
  lastPlayedAt: string | null | undefined;
  playbackPosition: number;
  completed: boolean;
  zone: PlaybackZone;
};

export type PlaybackStateMergeResult = {
  lastPlayedAt: string | null;
  playbackPosition: number;
  completed: boolean;
  zone: PlaybackZone;
};

export type PlaybackHandoffTimestamp = string | number | null | undefined;

export type ResolveHandoffDecisionInput = {
  localItemIdText: string | null | undefined;
  localLastPlayedAt: PlaybackHandoffTimestamp;
  serverItemIdText: string | null | undefined;
  serverLastPlayedAt: PlaybackHandoffTimestamp;
  isPlayingLocally: boolean;
};

export type ResolveHandoffDecisionResult =
  { kind: 'none' } | { kind: 'adopt_position' } | { kind: 'prompt'; serverItemIdText: string };

export const clampClientPlaybackTimestamp = (
  clientIso: string | null | undefined,
  receivedAtIso: string,
  allowanceMs: number = PLAYBACK_CLOCK_SKEW_ALLOWANCE_MS
): string => {
  const clientMs = toEpochMsOrNull(clientIso);
  if (clientMs === null) {
    return receivedAtIso;
  }

  const receivedAtMs = toEpochMsOrNull(receivedAtIso);
  if (receivedAtMs === null) {
    return clientIso ?? receivedAtIso;
  }

  if (clientMs > receivedAtMs + allowanceMs) {
    return receivedAtIso;
  }

  return clientIso ?? receivedAtIso;
};

export const computeClockOffsetMs = (
  serverDateHeader: string | null | undefined,
  deviceNowMs: number
): number | null => {
  if (!Number.isFinite(deviceNowMs)) {
    return null;
  }

  const serverMs = toEpochMsOrNull(serverDateHeader);
  if (serverMs === null) {
    return null;
  }

  return deviceNowMs - serverMs;
};

export const applyClockOffset = (deviceTimestampMs: number, offsetMs: number): number =>
  deviceTimestampMs - offsetMs;

/**
 * Merge two playback states for the same item.
 *
 * This merge is idempotent without an event id: replaying the same state computes the same winner
 * because ordering is a max over meaningful timestamps, completion only moves to true, and position
 * only moves forward.
 */
export const mergePlaybackState = (
  left: PlaybackStateMergeInput,
  right: PlaybackStateMergeInput
): PlaybackStateMergeResult => {
  const leftMs = toEpochMsOrNull(left.lastPlayedAt);
  const rightMs = toEpochMsOrNull(right.lastPlayedAt);

  const winner = (() => {
    if (leftMs === null) {
      return rightMs === null ? left : right;
    }
    if (rightMs === null) {
      return left;
    }

    return rightMs > leftMs ? right : left;
  })();

  const leftPosition = Number.isFinite(left.playbackPosition) ? left.playbackPosition : 0;
  const rightPosition = Number.isFinite(right.playbackPosition) ? right.playbackPosition : 0;

  return {
    lastPlayedAt: winner.lastPlayedAt ?? null,
    playbackPosition: Math.max(leftPosition, rightPosition),
    completed: left.completed || right.completed,
    zone: winner.zone,
  };
};

const normalizeItemIdText = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toTimestampMs = (value: PlaybackHandoffTimestamp): number | null => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null;
    }
    return Math.trunc(value);
  }

  return toEpochMsOrNull(value);
};

export const resolveHandoffDecision = ({
  localItemIdText,
  localLastPlayedAt,
  serverItemIdText,
  serverLastPlayedAt,
  isPlayingLocally,
}: ResolveHandoffDecisionInput): ResolveHandoffDecisionResult => {
  if (isPlayingLocally) {
    return { kind: 'none' };
  }

  const localItemId = normalizeItemIdText(localItemIdText);
  const serverItemId = normalizeItemIdText(serverItemIdText);
  if (localItemId === null || serverItemId === null) {
    return { kind: 'none' };
  }

  if (localItemId === serverItemId) {
    return { kind: 'adopt_position' };
  }

  const localTimestampMs = toTimestampMs(localLastPlayedAt);
  const serverTimestampMs = toTimestampMs(serverLastPlayedAt);
  if (serverTimestampMs === null) {
    return { kind: 'none' };
  }
  if (localTimestampMs === null || serverTimestampMs > localTimestampMs) {
    return { kind: 'prompt', serverItemIdText: serverItemId };
  }

  return { kind: 'none' };
};
