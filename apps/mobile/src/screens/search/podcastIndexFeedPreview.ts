import type { DTOChannel } from '@podverse/helpers';
import {
  DIRECTORY_ADD_POLL_TIMEOUT_MS,
  isAlbumMediumId,
  isArtistMediumId,
} from '@podverse/helpers';

export const PI_FEED_ADD_POLL_INTERVAL_MS = 2000;

/** Soft UX notice while still polling (does not stop the poll). */
export const PI_FEED_ADD_SOFT_NOTICE_MS = 60_000;

export { DIRECTORY_ADD_POLL_TIMEOUT_MS as PI_FEED_ADD_POLL_TIMEOUT_MS };

type ChannelWithReadyFields = Pick<DTOChannel, 'id_text' | 'medium_id'>;

export const isParsedReadyChannel = <T extends ChannelWithReadyFields>(
  channel: T | null
): channel is T => {
  return channel !== null && channel.id_text.length > 0 && Boolean(channel.medium_id);
};

export type PiFeedAddOutcome = 'ready' | 'timeout' | 'cancelled';

export type ChannelDetailRouteKind = 'podcast' | 'album' | 'artist';

/**
 * Maps channel medium to detail kind (web parity with
 * getChannelRouteKind / redirectToChannelPageByMedium). Used on Search (and Home)
 * stacks that register the shared channel-browse screens.
 */
export const getChannelDetailRouteKind = (
  mediumId: number | null | undefined
): ChannelDetailRouteKind => {
  if (isArtistMediumId(mediumId)) {
    return 'artist';
  }
  if (isAlbumMediumId(mediumId)) {
    return 'album';
  }
  return 'podcast';
};

/**
 * Pure poll loop helper used by PodcastIndexFeedPreviewScreen.
 * Calls `fetchChannel` until parsed-ready, cancelled, or `timeoutMs` elapses
 * (default: DIRECTORY_ADD_POLL_TIMEOUT_MS = 10 minutes).
 */
export const pollUntilParsedReadyChannel = async <T extends ChannelWithReadyFields>(params: {
  fetchChannel: () => Promise<T | null>;
  intervalMs?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  shouldContinue?: () => boolean;
  now?: () => number;
}): Promise<{ outcome: PiFeedAddOutcome; channel: T | null }> => {
  const intervalMs = params.intervalMs ?? PI_FEED_ADD_POLL_INTERVAL_MS;
  const timeoutMs = params.timeoutMs ?? DIRECTORY_ADD_POLL_TIMEOUT_MS;
  const sleep =
    params.sleep ??
    ((ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      }));
  const shouldContinue = params.shouldContinue ?? (() => true);
  const now = params.now ?? Date.now;

  const deadline = now() + timeoutMs;

  while (now() < deadline) {
    if (!shouldContinue()) {
      return { outcome: 'cancelled', channel: null };
    }

    const channel = await params.fetchChannel();
    if (isParsedReadyChannel(channel)) {
      return { outcome: 'ready', channel };
    }

    if (now() + intervalMs >= deadline) {
      break;
    }

    await sleep(intervalMs);
  }

  if (!shouldContinue()) {
    return { outcome: 'cancelled', channel: null };
  }

  const finalChannel = await params.fetchChannel();
  if (isParsedReadyChannel(finalChannel)) {
    return { outcome: 'ready', channel: finalChannel };
  }

  return { outcome: 'timeout', channel: null };
};
