import { trimPlaybackPositionNearEnd } from './playbackResumeNearEnd';

/** Shape of queue abridged `items[id]` entries used for resume. */
export type QueueItemAbridgedLike = { p?: number | string; d?: number | string };

function parseSeconds(raw: number | string | undefined | null): number {
  if (raw === undefined || raw === null) {
    return 0;
  }
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Parses optional numeric seconds from queue resources / API fields (same behavior as prior inline helpers).
 */
export function parseQueueResourceNumericSeconds(
  raw: string | number | null | undefined
): number | undefined {
  if (raw === null || raw === undefined) {
    return undefined;
  }
  const n = parseFloat(String(raw));
  return Number.isNaN(n) ? undefined : n;
}

/**
 * Single source of truth for music `session_restore` initial seek:
 * explicit `mpCurrentTime` / queue `playback_position` wins over abridged index `p` when provided.
 * Uses `trimPlaybackPositionNearEnd` with the best-known duration hint.
 */
export function resolveMusicSessionRestoreSeekSeconds(params: {
  explicitPlaybackSeconds?: number;
  abridged: QueueItemAbridgedLike | undefined;
  mpDurationHint?: number;
}): { seekSeconds: number; durationFromIndex: number } {
  const durationFromIndex = parseSeconds(params.abridged?.d);
  const positionFromIndex = parseSeconds(params.abridged?.p);

  const durationForExplicitTrim =
    params.mpDurationHint !== undefined && params.mpDurationHint > 0
      ? params.mpDurationHint
      : durationFromIndex;

  if (params.explicitPlaybackSeconds !== undefined) {
    const seekSeconds = trimPlaybackPositionNearEnd(
      params.explicitPlaybackSeconds,
      durationForExplicitTrim
    );
    return { seekSeconds, durationFromIndex };
  }

  const seekSeconds = trimPlaybackPositionNearEnd(positionFromIndex, durationFromIndex);
  return { seekSeconds, durationFromIndex };
}
