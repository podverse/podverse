import type { MediaSourceDelivery } from '@podverse/helpers';
import type { LiveSeekWindow } from '@podverse/playback-core';

/** The `TimeRanges` members the window reader uses. */
export type SeekableRanges = Pick<TimeRanges, 'length' | 'start' | 'end'>;

/**
 * The live window an HTML media element holds, on its own timeline. Null for progressive
 * delivery and before the stream reports a seekable range.
 *
 * Only the last seekable range counts. The live edge is hls.js's live sync position when it has
 * one, kept inside the range. Native HLS has none, so the edge sits `nativeJoinOffsetSeconds`
 * before the range end: the distance playback sat from the end when it first joined live.
 */
export function readLiveSeekWindow(params: {
  delivery: MediaSourceDelivery;
  seekable: SeekableRanges;
  liveSyncPositionSeconds: number | null;
  nativeJoinOffsetSeconds: number | null;
}): LiveSeekWindow | null {
  const { delivery, seekable, liveSyncPositionSeconds, nativeJoinOffsetSeconds } = params;
  if (delivery !== 'hls') {
    return null;
  }
  const { length } = seekable;
  if (length === 0) {
    return null;
  }
  const start = seekable.start(length - 1);
  const end = seekable.end(length - 1);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  const edge =
    liveSyncPositionSeconds !== null && Number.isFinite(liveSyncPositionSeconds)
      ? Math.min(liveSyncPositionSeconds, end)
      : end - (nativeJoinOffsetSeconds ?? 0);
  return { startSeconds: start, liveEdgeSeconds: Math.max(edge, start) };
}
