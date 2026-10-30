import { formatHHMMSS } from '@podverse/helpers';

/** Behind the live edge by this many seconds or fewer still counts as live. */
export const LIVE_EDGE_TOLERANCE_SECONDS = 10;

/** A window shorter than this offers no rewind: less than two 15-second skip-backs. */
export const LIVE_MIN_REWIND_WINDOW_SECONDS = 30;

/**
 * Seeks and resumes stay this far inside the window start, because the start moves forward
 * while the player is paused or seeking. One recommended HLS segment.
 */
export const LIVE_WINDOW_START_MARGIN_SECONDS = 6;

/**
 * The part of a live stream the player still holds, in seconds on the player's own media
 * timeline. Sample it at the same moment as the position it is compared with.
 *
 * - `startSeconds`: the earliest position the stream still holds (start of the last seekable
 *   range).
 * - `liveEdgeSeconds`: the position the platform's own go-to-live seek lands on.
 *
 * `null` when the stream holds no history (progressive delivery) or has not reported a window.
 */
export type LiveSeekWindow = {
  startSeconds: number;
  liveEdgeSeconds: number;
};

/** What the player does next. `seek` targets are on the same timeline as the window. */
export type LivePositionAction =
  { action: 'resume-in-place' } | { action: 'seek'; seconds: number } | { action: 'reconnect' };

/** True when the window spans at least `LIVE_MIN_REWIND_WINDOW_SECONDS`. */
export function isRewindableLiveWindow(window: LiveSeekWindow | null): window is LiveSeekWindow {
  return (
    window !== null &&
    window.liveEdgeSeconds - window.startSeconds >= LIVE_MIN_REWIND_WINDOW_SECONDS
  );
}

/** Whole seconds behind the live edge, or 0 when the position or window cannot be measured. */
export function getBehindLiveSeconds(params: {
  positionSeconds: number | null;
  window: LiveSeekWindow | null;
}): number {
  const { positionSeconds, window } = params;
  if (window === null || positionSeconds === null) {
    return 0;
  }
  if (!Number.isFinite(positionSeconds) || !Number.isFinite(window.liveEdgeSeconds)) {
    return 0;
  }
  return Math.max(0, Math.floor(window.liveEdgeSeconds - positionSeconds));
}

/** Left-hand time while behind live: a U+2212 minus and the playback clock, `\u22120:42`. */
export function formatBehindLiveLabel(behindSeconds: number): string {
  return `\u2212${formatHHMMSS(behindSeconds)}`;
}

export type LivePlaybackDisplay = {
  /** Within LIVE_EDGE_TOLERANCE_SECONDS of the live edge, or no window to measure against. */
  isAtLiveEdge: boolean;
  /** 0 at the live edge; otherwise whole seconds behind it. */
  behindLiveSeconds: number;
  /** Left-hand text: null at the live edge, `formatBehindLiveLabel(...)` when behind. */
  behindLiveLabel: string | null;
  /** The window is rewindable: show the scrubber and skip buttons. */
  canRewind: boolean;
  /** Scrubber position 0..1 across [startSeconds, liveEdgeSeconds]; null unless canRewind. */
  windowFraction: number | null;
};

/** Live-edge flag, behind-live label, and scrubber fraction for one sampled position. */
export function resolveLivePlaybackDisplay(params: {
  positionSeconds: number | null;
  window: LiveSeekWindow | null;
}): LivePlaybackDisplay {
  const raw = getBehindLiveSeconds(params);
  const isAtLiveEdge = raw <= LIVE_EDGE_TOLERANCE_SECONDS;
  const { positionSeconds, window } = params;
  const rewindableWindow = isRewindableLiveWindow(window) ? window : null;

  let windowFraction: number | null = null;
  if (rewindableWindow !== null && positionSeconds !== null && Number.isFinite(positionSeconds)) {
    if (isAtLiveEdge) {
      windowFraction = 1;
    } else {
      const span = rewindableWindow.liveEdgeSeconds - rewindableWindow.startSeconds;
      const ratio = (positionSeconds - rewindableWindow.startSeconds) / span;
      windowFraction = Math.min(1, Math.max(0, ratio));
    }
  }

  return {
    isAtLiveEdge,
    behindLiveSeconds: isAtLiveEdge ? 0 : raw,
    behindLiveLabel: isAtLiveEdge ? null : formatBehindLiveLabel(raw),
    canRewind: rewindableWindow !== null,
    windowFraction,
  };
}

/** Clamp a live seek target into [startSeconds + margin, liveEdgeSeconds]. */
export function clampLiveSeekSeconds(window: LiveSeekWindow, targetSeconds: number): number {
  const low = window.startSeconds + LIVE_WINDOW_START_MARGIN_SECONDS;
  if (low >= window.liveEdgeSeconds) {
    return window.liveEdgeSeconds;
  }
  return Math.min(window.liveEdgeSeconds, Math.max(low, targetSeconds));
}

/** The seek target for a scrubber fraction 0..1 across the window, clamped. */
export function liveSeekSecondsAtFraction(window: LiveSeekWindow, fraction: number): number {
  const f = Math.min(1, Math.max(0, fraction));
  return clampLiveSeekSeconds(
    window,
    window.startSeconds + f * (window.liveEdgeSeconds - window.startSeconds)
  );
}

/** Pressing play on a paused livestream. */
export function resolveLiveResume(params: {
  positionSeconds: number | null;
  window: LiveSeekWindow | null;
}): LivePositionAction {
  const { positionSeconds, window } = params;
  if (window === null) {
    return { action: 'reconnect' };
  }
  if (positionSeconds === null || !Number.isFinite(positionSeconds)) {
    return { action: 'seek', seconds: window.liveEdgeSeconds };
  }
  if (positionSeconds >= window.startSeconds + LIVE_WINDOW_START_MARGIN_SECONDS) {
    return { action: 'resume-in-place' };
  }
  return { action: 'seek', seconds: window.liveEdgeSeconds };
}

/** Pressing the Live control. */
export function resolveGoToLive(
  window: LiveSeekWindow | null
): Extract<LivePositionAction, { action: 'seek' } | { action: 'reconnect' }> {
  if (window === null) {
    return { action: 'reconnect' };
  }
  return { action: 'seek', seconds: window.liveEdgeSeconds };
}
