import { toEpochMsOrNull } from '@podverse/helpers';

import { LOCAL_STORAGE } from '../constants/localStorage';

export type PlaybackHandoffTimestamp = string | number | null | undefined;

const normalizeStateKeyPart = (value: string | null | undefined): string | null => {
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

export const buildPlaybackHandoffDismissedStateKey = ({
  serverItemIdText,
  serverLastPlayedAt,
}: {
  serverItemIdText: string | null | undefined;
  serverLastPlayedAt: PlaybackHandoffTimestamp;
}): string | null => {
  const itemIdText = normalizeStateKeyPart(serverItemIdText);
  const timestampMs = toTimestampMs(serverLastPlayedAt);
  if (itemIdText === null || timestampMs === null || timestampMs <= 0) {
    return null;
  }
  return `${itemIdText}::${timestampMs}`;
};

export const readPlaybackHandoffDismissedStateKey = (storage?: Storage): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const store = storage ?? window.localStorage;
  const raw = store.getItem(LOCAL_STORAGE.PLAYBACK_HANDOFF_DISMISSED_STATE_KEY);
  return normalizeStateKeyPart(raw);
};

export const writePlaybackHandoffDismissedStateKey = (
  dismissedStateKey: string | null,
  storage?: Storage
): void => {
  if (typeof window === 'undefined') {
    return;
  }
  const store = storage ?? window.localStorage;
  const normalized = normalizeStateKeyPart(dismissedStateKey);
  if (normalized === null) {
    store.removeItem(LOCAL_STORAGE.PLAYBACK_HANDOFF_DISMISSED_STATE_KEY);
    return;
  }
  store.setItem(LOCAL_STORAGE.PLAYBACK_HANDOFF_DISMISSED_STATE_KEY, normalized);
};
