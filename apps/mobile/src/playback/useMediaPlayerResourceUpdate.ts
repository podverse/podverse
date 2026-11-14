import { useCallback, useEffect, useRef } from 'react';

import { generateQueueResourceAbridgedIndex } from '@podverse/helpers/queue/abridged';
import type { PlaybackLoadDecision, PlaybackLoadRequest, PlaybackTarget } from '@podverse/playback-core';
import { resolvePlaybackLoadDecision } from '@podverse/playback-core/resolvePlaybackLoadDecision';

import { useAuth } from '../auth/AuthProvider';
import { nativePlaybackBridge } from '../bridge/nativePlaybackBridge';
import type { MobileAuthRequestContext } from '../data';
import { queueRepository } from '../data';
import { EMPTY_ABRIDGED_INDEX } from '../lib/addByRss/domain';
import { readDeviceItemPlaybackSeconds } from '../lib/playback/deviceItemPlayback';
import { resolveEngineAudioProfile } from '../lib/playback/engineAudioProfile';
import { mediaEngineSourceMetaFromTarget } from '../lib/playback/mediaEngineSourceMeta';
import { withAddByRssPlaybackAuth } from './addByRssMediaAuth';

const directoryItemIdText = (target: PlaybackTarget): string | null => {
  switch (target.kind) {
    case 'item-music':
    case 'item-podcast':
    case 'item-video':
      return target.item.id_text;
    default:
      return null;
  }
};

/**
 * RN equivalent of web `useMediaPlayerResourceUpdate`: apply a playback-core load decision to the
 * native engine. Signed out, a directory item resumes from the position stored for this device.
 * Signed in, the decision comes from the abridged resume index, unless a playback-core decision is
 * explicitly provided (for enclosure-switch resume). Loads the URL at the decided seek, applies
 * rate, and auto-plays when the decision says so. Returns the decision so the orchestrator can arm
 * bounded `pauseAt` enforcement (the native bridge has no pause-at). All load policy lives in
 * `@podverse/playback-core`; this is transport wiring only.
 */
export function useMediaPlayerResourceUpdate() {
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();

  const authRef = useRef({ accessToken, clearSession, refreshToken, setTokens, status });
  useEffect(() => {
    authRef.current = { accessToken, clearSession, refreshToken, setTokens, status };
  }, [accessToken, clearSession, refreshToken, setTokens, status]);

  return useCallback(
    async (
      request: PlaybackLoadRequest,
      url: string,
      playbackRate: number,
      // Session restore loads paused (no surprise audio on cold start); pass `false` to override the
      // decision's autoplay. When undefined the playback-core decision decides.
      autoPlayOverride?: boolean,
      playbackDecisionOverride?: PlaybackLoadDecision
    ): Promise<PlaybackLoadDecision> => {
      const { accessToken, clearSession, refreshToken, setTokens, status } = authRef.current;

      let loadRequest = request;
      if (status !== 'authenticated' && request.explicitPlaybackSeconds === undefined) {
        const itemIdText = directoryItemIdText(request.target);
        if (itemIdText !== null) {
          try {
            const seconds = await readDeviceItemPlaybackSeconds(itemIdText);
            if (seconds !== null) {
              loadRequest = { ...request, explicitPlaybackSeconds: seconds };
            }
          } catch {
            loadRequest = request;
          }
        }
      }

      let abridged = EMPTY_ABRIDGED_INDEX;
      if (status === 'authenticated') {
        try {
          const context: MobileAuthRequestContext = {
            accessToken,
            clearSession,
            refreshToken,
            setTokens,
          };
          const rows = await queueRepository.getAbridgedIndex(context);
          abridged = generateQueueResourceAbridgedIndex(rows);
        } catch {
          abridged = EMPTY_ABRIDGED_INDEX;
        }
      }

      const decision =
        playbackDecisionOverride ?? resolvePlaybackLoadDecision(loadRequest, { abridged });
      const shouldAutoPlay = autoPlayOverride ?? decision.shouldAutoPlay;
      const meta = mediaEngineSourceMetaFromTarget(request.target, 'js');
      const source = await withAddByRssPlaybackAuth(loadRequest.target, {
        audioProfile: resolveEngineAudioProfile(request.target),
        initialSeekSeconds: decision.initialSeekSeconds,
        ...(meta !== null ? { meta } : {}),
        url,
      });
      // Autoplay uses the atomic `loadAndStart` (2.25); session restore stays load-only (paused) so a
      // cold start never surprises with audio. Rate is applied right after the item is prepared.
      if (shouldAutoPlay) {
        await nativePlaybackBridge.loadAndStart(source);
      } else {
        await nativePlaybackBridge.load(source);
        // Restore / prepare-without-play: keep the item loaded and the rate armed, but never start.
        nativePlaybackBridge.pause();
      }
      nativePlaybackBridge.setRate(playbackRate);
      return decision;
    },
    []
  );
}
