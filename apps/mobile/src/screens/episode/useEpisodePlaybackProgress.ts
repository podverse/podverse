import { useEffect, useMemo, useState } from 'react';

import type { DTOItem } from '@podverse/helpers';
import { generateQueueResourceAbridgedIndex } from '@podverse/helpers/queue/abridged';

import { useAuth } from '../../auth/AuthProvider';
import type { MobileAuthRequestContext } from '../../data';
import { queueRepository } from '../../data';
import { playbackTargetRowMediaId } from '../../lib/playback/buildPlaybackTarget';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import type { EpisodePlaybackProgress } from './episodePlaybackProgress';
import { parsePlaybackSeconds } from './episodePlaybackProgress';

/**
 * Last stored progress for one episode, plus whether that episode is the active playback target.
 *
 * Live ticks stay out of this hook so a paused or other-item session does not re-render the
 * episode page on every timeupdate. The play chrome mounts a live subscriber only while this
 * item is now-playing.
 */
export function useEpisodeStoredProgress(episode: DTOItem | null): {
  isActiveEpisode: boolean;
  stored: EpisodePlaybackProgress;
} {
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { activeTarget } = usePlaybackSession();
  const [stored, setStored] = useState<EpisodePlaybackProgress>({
    durationSeconds: 0,
    positionSeconds: 0,
  });

  const isActiveEpisode =
    episode !== null &&
    activeTarget !== null &&
    playbackTargetRowMediaId(activeTarget) === episode.id_text;

  useEffect(() => {
    if (episode === null || status !== 'authenticated') {
      setStored({ durationSeconds: 0, positionSeconds: 0 });
      return;
    }

    let isMounted = true;
    const context: MobileAuthRequestContext = {
      accessToken,
      clearSession,
      refreshToken,
      setTokens,
    };

    void (async () => {
      try {
        const rows = await queueRepository.getAbridgedIndex(context);
        if (!isMounted) {
          return;
        }
        const index = generateQueueResourceAbridgedIndex(rows);
        const record = index.items[episode.id];
        setStored({
          durationSeconds: parsePlaybackSeconds(record?.d),
          positionSeconds: parsePlaybackSeconds(record?.p),
        });
      } catch {
        if (isMounted) {
          setStored({ durationSeconds: 0, positionSeconds: 0 });
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [accessToken, clearSession, episode, refreshToken, setTokens, status]);

  return useMemo(() => {
    const itemDurationSeconds = parsePlaybackSeconds(episode?.item_about.duration);
    const durationSeconds =
      stored.durationSeconds > 0 ? stored.durationSeconds : itemDurationSeconds;

    return {
      isActiveEpisode,
      stored: {
        durationSeconds,
        positionSeconds: stored.positionSeconds,
      },
    };
  }, [episode, isActiveEpisode, stored]);
}
