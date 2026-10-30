import type { PlaybackStatePublishBody } from '@podverse/helpers';
import {
  isDTOPlaybackResourceSummary,
  PLAYBACK_RATE_MAX,
  PLAYBACK_RATE_MIN,
  PLAYBACK_STATUSES,
} from '@podverse/helpers';

import type { BroadcastChannelLike } from '../notifications/stream/notificationStreamCoordinator';

export type PlaybackTabMessage =
  | { kind: 'audio-tab'; accountId: number; tabId: string; claimedAtMs: number }
  | {
      kind: 'audio-tab-gone';
      accountId: number;
      tabId: string;
      lastState: PlaybackStatePublishBody | null;
    }
  | { kind: 'tab-focused'; accountId: number; tabId: string; atMs: number }
  | { kind: 'tab-gone'; accountId: number; tabId: string }
  | { kind: 'audio-tab-query'; accountId: number; tabId: string };

export type PlaybackTabChannel = {
  /** False when this browser has no `BroadcastChannel`; every method then does nothing. */
  available: boolean;
  announceAudioTab(claimedAtMs: number): void;
  announceAudioTabGone(lastState: PlaybackStatePublishBody | null): void;
  announceFocused(atMs: number): void;
  announceGone(): void;
  /** Asks the tab that holds audio to announce itself. */
  askForAudioTab(): void;
  close(): void;
};

/** Shared by every account; each message carries its `accountId`. */
const PLAYBACK_TAB_CHANNEL_NAME = 'podverse:playback-tabs';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNullableNonNegativeFiniteNumber(value: unknown): value is number | null {
  return value === null || (isFiniteNumber(value) && value >= 0);
}

function readPublishBody(value: unknown): PlaybackStatePublishBody | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const claim = 'claim' in value ? value.claim : undefined;
  const resource = 'resource' in value ? value.resource : undefined;
  const status = 'status' in value ? value.status : undefined;
  const isLive = 'is_live' in value ? value.is_live : undefined;
  const positionSeconds = 'position_seconds' in value ? value.position_seconds : undefined;
  const durationSeconds = 'duration_seconds' in value ? value.duration_seconds : undefined;
  const rate = 'rate' in value ? value.rate : undefined;

  const matchedStatus = PLAYBACK_STATUSES.find((candidate) => candidate === status);
  if (
    typeof claim !== 'boolean' ||
    (resource !== null && !isDTOPlaybackResourceSummary(resource)) ||
    matchedStatus === undefined ||
    typeof isLive !== 'boolean' ||
    !isNullableNonNegativeFiniteNumber(positionSeconds) ||
    !isNullableNonNegativeFiniteNumber(durationSeconds) ||
    !isFiniteNumber(rate) ||
    rate < PLAYBACK_RATE_MIN ||
    rate > PLAYBACK_RATE_MAX
  ) {
    return null;
  }

  return {
    claim,
    resource,
    status: matchedStatus,
    is_live: isLive,
    position_seconds: positionSeconds,
    duration_seconds: durationSeconds,
    rate,
  };
}

/** Channel data comes from other tabs, possibly running an older build, so it is checked here. */
function readPlaybackTabMessage(value: unknown): PlaybackTabMessage | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  if (!('kind' in value) || !('accountId' in value) || !('tabId' in value)) {
    return null;
  }
  const { kind, accountId, tabId } = value;
  if (typeof accountId !== 'number' || typeof tabId !== 'string' || tabId.length === 0) {
    return null;
  }

  switch (kind) {
    case 'audio-tab': {
      const claimedAtMs = 'claimedAtMs' in value ? value.claimedAtMs : undefined;
      return isFiniteNumber(claimedAtMs)
        ? { kind: 'audio-tab', accountId, tabId, claimedAtMs }
        : null;
    }
    case 'audio-tab-gone': {
      const lastState = 'lastState' in value ? readPublishBody(value.lastState) : null;
      return { kind: 'audio-tab-gone', accountId, tabId, lastState };
    }
    case 'tab-focused': {
      const atMs = 'atMs' in value ? value.atMs : undefined;
      return isFiniteNumber(atMs) ? { kind: 'tab-focused', accountId, tabId, atMs } : null;
    }
    case 'tab-gone':
      return { kind: 'tab-gone', accountId, tabId };
    case 'audio-tab-query':
      return { kind: 'audio-tab-query', accountId, tabId };
    default:
      return null;
  }
}

const UNAVAILABLE_PLAYBACK_TAB_CHANNEL: PlaybackTabChannel = {
  available: false,
  announceAudioTab: () => undefined,
  announceAudioTabGone: () => undefined,
  announceFocused: () => undefined,
  announceGone: () => undefined,
  askForAudioTab: () => undefined,
  close: () => undefined,
};

/**
 * Lets the tabs of one browser profile agree on which tab holds audio and which was focused last.
 * Messages from another account or from this tab are ignored.
 */
export function startPlaybackTabChannel(options: {
  accountId: number;
  tabId: string;
  createChannel: ((name: string) => BroadcastChannelLike) | null;
  onMessage: (message: PlaybackTabMessage) => void;
}): PlaybackTabChannel {
  const { accountId, tabId, createChannel, onMessage } = options;
  if (createChannel === null) {
    return UNAVAILABLE_PLAYBACK_TAB_CHANNEL;
  }

  const channel = createChannel(PLAYBACK_TAB_CHANNEL_NAME);
  let closed = false;

  channel.onmessage = (event) => {
    if (closed) {
      return;
    }
    const message = readPlaybackTabMessage(event.data);
    if (message === null || message.accountId !== accountId || message.tabId === tabId) {
      return;
    }
    onMessage(message);
  };

  const post = (message: PlaybackTabMessage) => {
    if (!closed) {
      channel.postMessage(message);
    }
  };

  return {
    available: true,
    announceAudioTab: (claimedAtMs) => {
      post({ kind: 'audio-tab', accountId, tabId, claimedAtMs });
    },
    announceAudioTabGone: (lastState) => {
      post({ kind: 'audio-tab-gone', accountId, tabId, lastState });
    },
    announceFocused: (atMs) => {
      post({ kind: 'tab-focused', accountId, tabId, atMs });
    },
    announceGone: () => {
      post({ kind: 'tab-gone', accountId, tabId });
    },
    askForAudioTab: () => {
      post({ kind: 'audio-tab-query', accountId, tabId });
    },
    close: () => {
      if (closed) {
        return;
      }
      closed = true;
      channel.onmessage = null;
      channel.close();
    },
  };
}
