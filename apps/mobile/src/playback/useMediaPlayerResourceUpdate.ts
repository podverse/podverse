import { useCallback, useEffect, useRef } from 'react';

import { generateQueueResourceAbridgedIndex } from '@podverse/helpers/queue/abridged';
import type { PlaybackLoadDecision, PlaybackLoadRequest } from '@podverse/playback-core';
import { resolvePlaybackLoadDecision } from '@podverse/playback-core/resolvePlaybackLoadDecision';

import { useAuth } from '../auth/AuthProvider';
import { nativePlaybackBridge } from '../bridge/nativePlaybackBridge';
import type { MobileAuthRequestContext } from '../data';
import { queueRepository } from '../data';
import { EMPTY_ABRIDGED_INDEX } from '../lib/addByRss/domain';

/**
 * RN equivalent of web `useMediaPlayerResourceUpdate`: apply a playback-core load decision to the
 * native engine. Resolves the decision from the abridged resume index (authenticated users only),
 * loads the URL at the decided seek, applies rate, and auto-plays when the decision says so. Returns
 * the decision so the orchestrator can arm bounded `pauseAt` enforcement (the native bridge has no
 * pause-at). All load policy lives in `@podverse/playback-core`; this is transport wiring only.
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
      autoPlayOverride?: boolean
    ): Promise<PlaybackLoadDecision> => {
      const { accessToken, clearSession, refreshToken, setTokens, status } = authRef.current;

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

      const decision = resolvePlaybackLoadDecision(request, { abridged });
      const shouldAutoPlay = autoPlayOverride ?? decision.shouldAutoPlay;
      const source = { initialSeekSeconds: decision.initialSeekSeconds, url };
      // Autoplay uses the atomic `loadAndStart` (2.25); session restore stays load-only (paused) so a
      // cold start never surprises with audio. Rate is applied right after the item is prepared.
      if (shouldAutoPlay) {
        await nativePlaybackBridge.loadAndStart(source);
      } else {
        await nativePlaybackBridge.load(source);
      }
      nativePlaybackBridge.setRate(playbackRate);
      return decision;
    },
    []
  );
}
