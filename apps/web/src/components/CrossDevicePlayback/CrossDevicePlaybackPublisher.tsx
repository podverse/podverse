'use client';

import type { RefObject } from 'react';
import { useCallback, useEffect, useRef } from 'react';

import type { DTOPlaybackResourceRef, PlaybackStatePublishBody } from '@podverse/helpers';

import { useCrossDevicePlaybackSnapshot } from '../../contexts/CrossDevicePlayback';
import { useMediaPlayer } from '../../contexts/MediaPlayer';
import { useMediaPlayerControls } from '../../contexts/MediaPlayerControls';
import { useMediaPlayerCurrentTime } from '../../contexts/MediaPlayerCurrentTime';
import { getApiRequestService } from '../../factories/apiRequestService';
import type { CrossDevicePlaybackSnapshot } from '../../lib/crossDevicePlayback/crossDevicePlaybackStore';
import { crossDevicePlaybackStore } from '../../lib/crossDevicePlayback/crossDevicePlaybackStore';
import type { PlaybackPublishOutcome } from '../../lib/crossDevicePlayback/playbackClaim';
import {
  publishPlaybackState,
  shouldClaimActiveDevice,
} from '../../lib/crossDevicePlayback/playbackClaim';
import type { PlaybackPublishScheduler } from '../../lib/crossDevicePlayback/playbackPublishScheduler';
import { createPlaybackPublishScheduler } from '../../lib/crossDevicePlayback/playbackPublishScheduler';
import type { PlayerResourceInput } from '../../lib/crossDevicePlayback/playbackResource';
import {
  buildPlaybackResourceRefFromPlayer,
  buildPlaybackStatePublishBody,
  isSamePlaybackResourceRef,
} from '../../lib/crossDevicePlayback/playbackResource';

/** A failing publish is tried this many times in a row; a claim is then given up. */
const PLAYBACK_PUBLISH_MAX_ATTEMPTS = 3;
/** Lapsed publishes in a row after which a playing tab stops claiming again and releases. */
const PLAYBACK_MAX_LAPSES = 3;

function holdsOrClaimsAudio(snapshot: CrossDevicePlaybackSnapshot): boolean {
  return snapshot.thisTabHoldsAudio || snapshot.claimPending;
}

function publishToApi(body: PlaybackStatePublishBody) {
  return getApiRequestService().reqAccountPlaybackPublishState(body);
}

type CrossDevicePlaybackPublisherProps = {
  /** This tab's newest body while it holds audio, else null; sent paused when the tab closes. */
  lastBodyRef: RefObject<PlaybackStatePublishBody | null>;
};

/**
 * Publishes this tab's playback while it holds audio, and claims the active device when it starts
 * playing. Headless; it re-renders on current-time updates so the rest of the tree does not.
 */
export function CrossDevicePlaybackPublisher({ lastBodyRef }: CrossDevicePlaybackPublisherProps) {
  const {
    mpAddByRSS,
    mpChannel,
    mpItem,
    mpClip,
    mpItemSoundbite,
    mpItemChapter,
    mpItemChapters,
    mpIsPlaying,
    mpShouldPlay,
    mpDuration,
    mpPlaybackSpeed,
  } = useMediaPlayer();
  const { mpCurrentTime } = useMediaPlayerCurrentTime();
  const { readCurrentTimeSeconds } = useMediaPlayerControls();
  const availability = useCrossDevicePlaybackSnapshot((snapshot) => snapshot.availability);
  const role = useCrossDevicePlaybackSnapshot((snapshot) => snapshot.role);
  const thisTabHoldsAudio = useCrossDevicePlaybackSnapshot(
    (snapshot) => snapshot.thisTabHoldsAudio
  );
  const claimPending = useCrossDevicePlaybackSnapshot((snapshot) => snapshot.claimPending);
  const activeSessionIdText = useCrossDevicePlaybackSnapshot(
    (snapshot) => snapshot.state?.active_session_id_text ?? null
  );
  const mediaElementPlaying = useCrossDevicePlaybackSnapshot(
    (snapshot) => snapshot.mediaElementPlaying
  );

  const schedulerRef = useRef<PlaybackPublishScheduler | null>(null);
  const syncRef = useRef<() => void>(() => undefined);
  /**
   * Set when this tab stops holding or claiming audio (lost, abandoned, released); cleared when
   * playback stops or the resource changes. Keeps a tab that just lost from claiming straight back.
   */
  const claimBlockedRef = useRef(false);
  /** Set after a lapse while playing, so the next body is a claim even though this tab holds audio. */
  const needsReclaimRef = useRef(false);
  const publishFailuresRef = useRef(0);
  const lapsesRef = useRef(0);
  const releaseInFlightRef = useRef(false);
  const lastResourceRefRef = useRef<DTOPlaybackResourceRef | null>(null);
  const isPlayingRef = useRef(false);
  const hasResourceRef = useRef(false);

  useEffect(() => {
    const store = crossDevicePlaybackStore;

    /** A claim is only worth retrying while the player still plays something. */
    const retryOrGiveUp = (body: PlaybackStatePublishBody) => {
      publishFailuresRef.current += 1;
      const claimStillWanted = isPlayingRef.current && hasResourceRef.current;
      if (
        publishFailuresRef.current < PLAYBACK_PUBLISH_MAX_ATTEMPTS &&
        (!body.claim || claimStillWanted)
      ) {
        schedulerRef.current?.flush();
        return;
      }
      publishFailuresRef.current = 0;
      if (!body.claim) {
        return;
      }
      needsReclaimRef.current = false;
      if (store.getSnapshot().thisTabHoldsAudio) {
        store.releaseAudio();
      } else {
        store.abandonClaim();
      }
    };

    const applyOutcome = (body: PlaybackStatePublishBody, outcome: PlaybackPublishOutcome) => {
      switch (outcome.kind) {
        case 'published':
          publishFailuresRef.current = 0;
          if (body.claim) {
            needsReclaimRef.current = false;
          } else {
            lapsesRef.current = 0;
          }
          return;
        case 'lost':
          publishFailuresRef.current = 0;
          needsReclaimRef.current = false;
          return;
        case 'unavailable':
          publishFailuresRef.current = 0;
          needsReclaimRef.current = false;
          store.releaseAudio();
          return;
        case 'lapsed':
          if (body.claim) {
            retryOrGiveUp(body);
            return;
          }
          lapsesRef.current += 1;
          if (isPlayingRef.current && lapsesRef.current <= PLAYBACK_MAX_LAPSES) {
            needsReclaimRef.current = true;
            return;
          }
          lapsesRef.current = 0;
          needsReclaimRef.current = false;
          store.releaseAudio();
          return;
        case 'retry':
          retryOrGiveUp(body);
          return;
      }
    };

    const scheduler = createPlaybackPublishScheduler({
      publish: async (body) => {
        if (body.claim) {
          store.beginClaim();
        }
        const outcome = await publishPlaybackState({ store, body, publish: publishToApi });
        applyOutcome(body, outcome);
        syncRef.current();
      },
    });
    schedulerRef.current = scheduler;

    let wasHoldingOrClaiming = holdsOrClaimsAudio(store.getSnapshot());
    const unsubscribe = store.subscribe(() => {
      const holdingOrClaiming = holdsOrClaimsAudio(store.getSnapshot());
      if (wasHoldingOrClaiming && !holdingOrClaiming) {
        claimBlockedRef.current = true;
      }
      wasHoldingOrClaiming = holdingOrClaiming;
    });

    return () => {
      unsubscribe();
      scheduler.stop();
      schedulerRef.current = null;
    };
  }, []);

  /** Publishes the release body once, outside the scheduler, then lets go of the audio. */
  const release = useCallback(
    (player: PlayerResourceInput) => {
      const store = crossDevicePlaybackStore;
      if (releaseInFlightRef.current) {
        return;
      }
      needsReclaimRef.current = false;
      lastBodyRef.current = null;
      const finish = () => {
        releaseInFlightRef.current = false;
        if (!hasResourceRef.current) {
          store.releaseAudio();
        }
        syncRef.current();
      };
      if (store.getSnapshot().availability !== 'ready') {
        store.releaseAudio();
        return;
      }
      releaseInFlightRef.current = true;
      const body = buildPlaybackStatePublishBody({
        player,
        isPlaying: false,
        shouldPlay: false,
        currentTimeSeconds: 0,
        durationSeconds: 0,
        rate: 1,
        claim: false,
      });
      void publishPlaybackState({ store, body, publish: publishToApi }).then(finish, finish);
    },
    [lastBodyRef]
  );

  const sync = useCallback(() => {
    const scheduler = schedulerRef.current;
    if (scheduler === null) {
      return;
    }
    const store = crossDevicePlaybackStore;
    const player: PlayerResourceInput = {
      mpAddByRSS,
      mpChannel,
      mpItem,
      mpClip,
      mpItemSoundbite,
      mpItemChapter,
      mpItemChapters,
    };
    const resourceRef = buildPlaybackResourceRefFromPlayer(player);
    if (!mpIsPlaying || !isSamePlaybackResourceRef(lastResourceRefRef.current, resourceRef)) {
      claimBlockedRef.current = false;
    }
    lastResourceRefRef.current = resourceRef;
    isPlayingRef.current = mpIsPlaying;
    hasResourceRef.current = resourceRef !== null;

    const snapshot = store.getSnapshot();
    if (resourceRef === null) {
      scheduler.update({ body: null });
      lastBodyRef.current = null;
      if (snapshot.thisTabHoldsAudio) {
        release(player);
      }
      return;
    }

    // A tab that holds audio while another session is active has lost; the provider stops it.
    const canPublish = snapshot.availability === 'ready' && snapshot.role !== 'remote';
    const activeSessionIsNull = (snapshot.state?.active_session_id_text ?? null) === null;
    const claim = shouldClaimActiveDevice({
      canPublish,
      wantsToPlay: mpIsPlaying,
      mediaElementPlaying: snapshot.mediaElementPlaying,
      claimBlocked: claimBlockedRef.current,
      thisTabHoldsAudio: snapshot.thisTabHoldsAudio,
      activeSessionIsNull,
      needsReclaim: needsReclaimRef.current,
    });
    if (!claim && !(canPublish && snapshot.thisTabHoldsAudio)) {
      scheduler.update({ body: null });
      lastBodyRef.current = null;
      return;
    }

    const body = buildPlaybackStatePublishBody({
      player,
      isPlaying: mpIsPlaying,
      shouldPlay: mpShouldPlay,
      currentTimeSeconds: readCurrentTimeSeconds() ?? mpCurrentTime,
      durationSeconds: mpDuration,
      rate: mpPlaybackSpeed,
      claim,
    });
    lastBodyRef.current = snapshot.thisTabHoldsAudio ? body : null;
    scheduler.update({ body });
  }, [
    mpAddByRSS,
    mpChannel,
    mpItem,
    mpClip,
    mpItemSoundbite,
    mpItemChapter,
    mpItemChapters,
    mpIsPlaying,
    mpShouldPlay,
    mpDuration,
    mpPlaybackSpeed,
    mpCurrentTime,
    readCurrentTimeSeconds,
    lastBodyRef,
    release,
  ]);

  useEffect(() => {
    syncRef.current = sync;
    sync();
  }, [sync]);

  // `sync` reads the store itself; these only make it run again when the store changes.
  useEffect(() => {
    syncRef.current();
  }, [
    availability,
    role,
    thisTabHoldsAudio,
    claimPending,
    activeSessionIdText,
    mediaElementPlaying,
  ]);

  useEffect(() => {
    const syncMediaElementPlaying = () => {
      const playing = Array.from(document.querySelectorAll('audio, video')).some(
        (element) => element instanceof HTMLMediaElement && !element.paused && !element.ended
      );
      crossDevicePlaybackStore.setMediaElementPlaying(playing);
    };
    document.addEventListener('playing', syncMediaElementPlaying, true);
    document.addEventListener('pause', syncMediaElementPlaying, true);
    document.addEventListener('ended', syncMediaElementPlaying, true);
    return () => {
      document.removeEventListener('playing', syncMediaElementPlaying, true);
      document.removeEventListener('pause', syncMediaElementPlaying, true);
      document.removeEventListener('ended', syncMediaElementPlaying, true);
      crossDevicePlaybackStore.setMediaElementPlaying(false);
    };
  }, []);

  return null;
}
