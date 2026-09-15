import { resolveHandoffDecision } from '@podverse/helpers';

import type { PlaybackReconcileDifferentNowPlayingConflict } from '../data/repositories/playbackReconcile';

const normalizeKeyPart = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const buildPlaybackHandoffDismissedStateKey = (state: {
  resourceIdText: string;
  lastMeaningfulAt: number | null;
}): string | null => {
  const resourceIdText = normalizeKeyPart(state.resourceIdText);
  if (resourceIdText === null) {
    return null;
  }
  if (
    typeof state.lastMeaningfulAt !== 'number' ||
    !Number.isFinite(state.lastMeaningfulAt) ||
    state.lastMeaningfulAt <= 0
  ) {
    return null;
  }

  return `${resourceIdText}::${Math.trunc(state.lastMeaningfulAt)}`;
};

export const shouldPromptForPlaybackHandoffConflict = ({
  conflict,
  dismissedStateKey,
  isPlayingLocally,
}: {
  conflict: PlaybackReconcileDifferentNowPlayingConflict;
  dismissedStateKey: string | null;
  isPlayingLocally: boolean;
}): boolean => {
  const decision = resolveHandoffDecision({
    localItemIdText: conflict.local.resourceIdText,
    localLastPlayedAt: conflict.local.lastMeaningfulAt,
    serverItemIdText: conflict.remote.resourceIdText,
    serverLastPlayedAt: conflict.remote.lastMeaningfulAt,
    isPlayingLocally,
  });
  if (decision.kind !== 'prompt') {
    return false;
  }

  const remoteKey = buildPlaybackHandoffDismissedStateKey(conflict.remote);
  if (remoteKey !== null && dismissedStateKey === remoteKey) {
    return false;
  }

  return true;
};
