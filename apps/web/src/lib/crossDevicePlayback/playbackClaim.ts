import type { PlaybackStatePublishBody, PlaybackStatePublishResponse } from '@podverse/helpers';
import { PLAYBACK_ERROR_CODES } from '@podverse/helpers';
import { parseMembershipGateError, parsePlaybackApiError } from '@podverse/helpers-requests';

import type { CrossDevicePlaybackStore } from './crossDevicePlaybackStore';

/**
 * This tab claims the active device only after a media element here has started. Wanting to
 * play is not enough: a rejected `play()` must not publish this tab as the active device.
 */
export function shouldClaimActiveDevice(params: {
  canPublish: boolean;
  wantsToPlay: boolean;
  mediaElementPlaying: boolean;
  claimBlocked: boolean;
  thisTabHoldsAudio: boolean;
  activeSessionIsNull: boolean;
  needsReclaim: boolean;
}): boolean {
  return (
    params.canPublish &&
    params.wantsToPlay &&
    params.mediaElementPlaying &&
    !params.claimBlocked &&
    (!params.thisTabHoldsAudio || params.activeSessionIsNull || params.needsReclaim)
  );
}

/**
 * `published`: the server wrote the state. `lost`: another device is active, so this tab released
 * its audio. `lapsed`: no device is active (this session's claim expired). `retry`: a network
 * error, 503, or other failure. `unavailable`: a membership 403.
 */
export type PlaybackPublishOutcome =
  | { kind: 'published' }
  | { kind: 'lost' }
  | { kind: 'lapsed' }
  | { kind: 'retry' }
  | { kind: 'unavailable' };

/**
 * Sends one publish and applies its result to the store: a success keeps the published state and
 * confirms a claim that is still pending (another tab may have won it meanwhile); a refusal naming
 * another device releases this tab's audio; a membership 403 marks availability `unavailable`.
 * Retry and lapse counting is the caller's.
 */
export async function publishPlaybackState(params: {
  store: CrossDevicePlaybackStore;
  body: PlaybackStatePublishBody;
  publish: (body: PlaybackStatePublishBody) => Promise<PlaybackStatePublishResponse>;
}): Promise<PlaybackPublishOutcome> {
  const { store, body, publish } = params;

  let response: PlaybackStatePublishResponse;
  try {
    response = await publish(body);
  } catch (error: unknown) {
    if (parseMembershipGateError(error) !== null) {
      store.markUnavailable();
      return { kind: 'unavailable' };
    }
    const playbackError = parsePlaybackApiError(error);
    if (playbackError?.code === PLAYBACK_ERROR_CODES.notActiveDevice) {
      if (typeof playbackError.activeSessionIdText === 'string') {
        store.releaseAudio();
        return { kind: 'lost' };
      }
      return { kind: 'lapsed' };
    }
    return { kind: 'retry' };
  }

  store.applyOwnPublish(body, response);
  if (body.claim && store.getSnapshot().claimPending) {
    store.confirmClaim();
  }
  return { kind: 'published' };
}
