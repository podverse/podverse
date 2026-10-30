'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
  EnclosureSelectedParams,
  LabeledItemEnclosure,
  QueueResourcesAbridgedIndex,
  SelectedLabeledItemEnclosureAndSource,
} from '@podverse/helpers';
import {
  getSelectedLabeledItemEnclosureAndSource,
  isEqual,
  isHlsSource,
  MediumEnum,
} from '@podverse/helpers';

import { useEmbedPlaybackGuardrails } from '../../../contexts/EmbedPlaybackMode';
import type { MediaPlayerAddByRSSState } from '../../../contexts/MediaPlayer';
import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useRegisterMediaPlayerControlsBridge } from '../../../contexts/MediaPlayerControls';
import { waitForPlayableMediaSource } from '../../../hooks/mediaElementBridgeSurface';
import type { AddByRSSMediaFailureParams } from '../../../hooks/useAddByRSSMediaFailureNotice';
import type { MediaElementBridge, MediaElementSource } from '../../../hooks/useMediaElementBridge';
import { useMediaElementBridge } from '../../../hooks/useMediaElementBridge';
import type { MoveNowPlayingToHistoryCallbackParams } from '../../../hooks/useQueueResourceMoveNowPlayingToHistory';
import type { QueueResourcesLoadActiveResult } from '../../../hooks/useQueueResourcesLoadActive';
import type { UpdateNowPlayingParams } from '../../../hooks/useQueueResourceUpdateNowPlaying';
import { takeCommandStartSeek } from '../../../lib/crossDevicePlayback/commandStartSeek';
import { crossDevicePlaybackStore } from '../../../lib/crossDevicePlayback/crossDevicePlaybackStore';
import {
  buildPlaybackResourceRefFromPlayer,
  isPlayerResourceLive,
} from '../../../lib/crossDevicePlayback/playbackResource';
import { notifyEmbedListItemEnded } from '../../../lib/embed/embedListPlaybackAdvance';
import {
  resolveEmbedPlaybackPauseAtSeconds,
  resolveEmbedPlaybackResetSeconds,
} from '../../../lib/embed/resolveEmbedPlaybackResetSeconds';
import { liveMediaStore } from '../../../lib/livePlayback/liveMediaStore';
import type {
  ListenSessionDirective,
  ListenSessionTarget,
  MusicItemPlaybackIntent,
  PlaybackLoadDecision,
} from '../../../lib/playback';
import {
  clampNearEndSeconds,
  listenSessionTargetForClip,
  selectItemChapterForTime,
} from '../../../lib/playback';
import {
  decideBlockedHostPlayback,
  resolvedPlaybackUrlForIdentity,
} from '../../../utils/media/blockedHostPlayback';
import type { MPPlaybackError, WebPlaybackErrorKind } from '../../../utils/media/playbackErrorCopy';
import {
  mediaErrorCodeLabel,
  mediaErrorKind,
  playbackErrorIdentity,
  playRejectionDetail,
  playRejectionKind,
  shouldAdvanceQueueAfterEnded,
} from '../../../utils/media/playbackErrorCopy';
import {
  checkIfIsAudioFile,
  checkIfIsVideoFile,
  checkIsLiveItem,
} from '../../../utils/mediaPlayer/mediaPlayerItemEnclosureType';
import { waitForSourceUri } from '../../../utils/mediaPlayer/mediaPlayerPlayMediaWhenReady';
import { resolveModalVideoAspectRatio } from '../../../utils/mediaPlayer/modalVideoAspectRatio';
import { webListenSession } from '../../../utils/statsTracking/statsTracking';
import { MediaElement } from '../MediaElement/MediaElement';
import { toFileMediaElementSource } from '../MediaElement/mediaElementSourceFromTarget';

const playbackErrorForLoadedItem = (params: {
  kind: WebPlaybackErrorKind;
  code: string;
  message: string;
  mediaUrl: string | null;
  addByRss: MediaPlayerAddByRSSState;
  item: DTOItem | null;
  clip: DTOClip | null;
  soundbite: DTOItemSoundbite | null;
}): MPPlaybackError | null => {
  const identity = playbackErrorIdentity({
    addByRssResourceData: params.addByRss?.resourceData ?? null,
    itemIdText: params.item?.id_text ?? null,
    clipIdText: params.clip?.id_text ?? null,
    soundbiteIdText: params.soundbite?.id_text ?? null,
  });
  if (identity === null) {
    return null;
  }
  return {
    kind: params.kind,
    identity,
    mediaUrl: params.mediaUrl,
    code: params.code,
    message: params.message,
  };
};

function listenSessionTargetFromPlayerState(state: {
  isAddByRSS: boolean;
  clip: DTOClip | null;
  item: DTOItem | null;
  soundbite: DTOItemSoundbite | null;
}): ListenSessionTarget | null {
  if (state.isAddByRSS) {
    return null;
  }
  if (state.clip !== null) {
    return listenSessionTargetForClip(state.clip);
  }
  const itemIdText = state.item?.id_text ?? state.soundbite?.item?.id_text ?? null;
  return itemIdText ? { kind: 'item', idText: itemIdText } : null;
}

export interface NonLiveMediaOrchestratorProps {
  mediaType: 'audio' | 'video';
  preload?: 'auto' | 'metadata' | 'none';
  style?: React.CSSProperties;
  hidden?: boolean;
  mpAddByRSS: MediaPlayerAddByRSSState;
  mpChannel: DTOChannel | null;
  mpClip: DTOClip | null;
  setMPClip: (clip: DTOClip | null) => void;
  mpItem: DTOItem | null;
  mpItemLabeledEnclosures: LabeledItemEnclosure[];
  mpEnclosureSelectedParams: EnclosureSelectedParams;
  mpItemChapter: DTOItemChapter | null;
  setMPItemChapter: (chapter: DTOItemChapter | null) => void;
  mpItemChapters: DTOItemChapter[] | null;
  mpItemChapterShouldSeek: boolean;
  setMPItemChapterShouldSeek: (seek: boolean) => void;
  mpItemSoundbite: DTOItemSoundbite | null;
  setMPItemSoundbite: (soundbite: DTOItemSoundbite | null) => void;
  mpIsPlaying: boolean;
  setMPIsPlaying: (playing: boolean) => void;
  mpPlaybackSpeed: number;
  mpVolume: number;
  mpIsMuted: boolean;
  mpShouldPlay: boolean;
  setMPShouldPlay: (shouldPlay: boolean) => void;
  setMPDuration: (duration: number) => void;
  mpCurrentTime: number;
  setMPCurrentTime: (time: number) => void;
  addByRSSSeekToTime: number | null;
  setAddByRSSSeekToTime: (time: number | null) => void;
  updateNowPlaying: (args: UpdateNowPlayingParams) => void;
  moveNowPlayingToHistory: (params: MoveNowPlayingToHistoryCallbackParams) => Promise<void>;
  queueResourcesLoadActive: (medium_id?: number) => Promise<QueueResourcesLoadActiveResult>;
  queueResourcesAbridgedIndex: QueueResourcesAbridgedIndex;
  /** Staged seek/play policy from `applyPlaybackLoad`; consumed on `loadedmetadata`. */
  pendingPlaybackDecision?: PlaybackLoadDecision | null;
  setPendingPlaybackDecision?: (decision: PlaybackLoadDecision | null) => void;
  /** When add-by-RSS is now playing, called to save position (e.g. every 15s and on pause). */
  onAddByRSSPositionSave?: (
    positionSeconds: number,
    eventKind: 'play' | 'pause' | 'progress_tick' | 'seek',
    isPlaying?: boolean
  ) => void;
  /** When add-by-RSS playback ends, called to add to history; then controller clears add-by-RSS state. */
  onAddByRSSEnded?: (positionSeconds: number) => Promise<void>;
  /** When add-by-RSS playback ends and queue is empty, try to play next from list context. Returns true if playback started. */
  onAddByRSSPlayNext?: () => Promise<boolean>;
  /**
   * When an add-by-RSS media load fails. Media always loads the plain URL, so a
   * password-protected feed's media fails here rather than prompting for credentials.
   */
  onAddByRSSMediaError?: (params: AddByRSSMediaFailureParams) => void;
  clearNowPlaying: () => void;
  /** Set to `fresh_transition` before skip/ended queue loads so music advances start at 0. */
  pendingMusicQueueLoadIntentRef: React.RefObject<MusicItemPlaybackIntent | null>;
  /** Called when the video element reports intrinsic dimensions (modal stage sizing). */
  onVideoAspectRatioChange?: (ratio: number | null) => void;
}

export const NonLiveMediaOrchestrator: React.FC<NonLiveMediaOrchestratorProps> = (props) => {
  const { embedPlayerSize, isEmbedRoute } = useEmbedPlaybackGuardrails();
  const { activePlaybackTarget, mpPlaybackError, reportPlaybackError, setMPPlaybackError } =
    useMediaPlayer();
  const playbackError = mpPlaybackError ?? null;
  const mpPlaybackErrorRef = useRef(playbackError);
  mpPlaybackErrorRef.current = playbackError;
  const reportPlaybackErrorRef = useRef(reportPlaybackError);
  reportPlaybackErrorRef.current = reportPlaybackError;

  const {
    mediaType,
    preload = 'auto',
    style,
    hidden,
    mpAddByRSS,
    mpChannel,
    mpClip,
    setMPClip,
    mpItem,
    mpItemLabeledEnclosures,
    mpEnclosureSelectedParams,
    mpItemChapter,
    setMPItemChapter,
    mpItemChapters,
    mpItemChapterShouldSeek,
    setMPItemChapterShouldSeek,
    mpItemSoundbite,
    setMPItemSoundbite,
    mpIsPlaying,
    setMPIsPlaying,
    mpPlaybackSpeed,
    mpVolume,
    mpIsMuted,
    mpShouldPlay,
    setMPShouldPlay,
    setMPDuration,
    mpCurrentTime: _mpCurrentTime,
    setMPCurrentTime,
    addByRSSSeekToTime,
    setAddByRSSSeekToTime,
    updateNowPlaying,
    moveNowPlayingToHistory,
    queueResourcesLoadActive,
    queueResourcesAbridgedIndex,
    pendingPlaybackDecision = null,
    setPendingPlaybackDecision,
    onAddByRSSPositionSave,
    onAddByRSSEnded,
    onAddByRSSPlayNext,
    onAddByRSSMediaError,
    clearNowPlaying,
    pendingMusicQueueLoadIntentRef,
    onVideoAspectRatioChange,
  } = props;

  const allowVideoOnAudioOrchestrator = embedPlayerSize === 'compact';

  const mediaRef = useRef<HTMLMediaElement | null>(null);

  const mpAddByRSSRef = useRef(mpAddByRSS);
  useEffect(() => {
    mpAddByRSSRef.current = mpAddByRSS;
  }, [mpAddByRSS]);
  const onAddByRSSPositionSaveRef = useRef(onAddByRSSPositionSave);
  useEffect(() => {
    onAddByRSSPositionSaveRef.current = onAddByRSSPositionSave;
  }, [onAddByRSSPositionSave]);
  const onAddByRSSEndedRef = useRef(onAddByRSSEnded);
  useEffect(() => {
    onAddByRSSEndedRef.current = onAddByRSSEnded;
  }, [onAddByRSSEnded]);
  const onAddByRSSPlayNextRef = useRef(onAddByRSSPlayNext);
  useEffect(() => {
    onAddByRSSPlayNextRef.current = onAddByRSSPlayNext;
  }, [onAddByRSSPlayNext]);
  const onAddByRSSMediaErrorRef = useRef(onAddByRSSMediaError);
  useEffect(() => {
    onAddByRSSMediaErrorRef.current = onAddByRSSMediaError;
  }, [onAddByRSSMediaError]);
  const clearNowPlayingRef = useRef(clearNowPlaying);
  useEffect(() => {
    clearNowPlayingRef.current = clearNowPlaying;
  }, [clearNowPlaying]);

  const isEmbedRouteRef = useRef(isEmbedRoute);
  useEffect(() => {
    isEmbedRouteRef.current = isEmbedRoute;
  }, [isEmbedRoute]);

  const mpChannelRef = useRef<typeof mpChannel>(null);
  useEffect(() => {
    mpChannelRef.current = mpChannel;
  }, [mpChannel]);
  const mpClipRef = useRef<typeof mpClip>(null);
  useEffect(() => {
    mpClipRef.current = mpClip;
  }, [mpClip]);
  const mpItemRef = useRef<typeof mpItem>(null);
  useEffect(() => {
    mpItemRef.current = mpItem;
  }, [mpItem]);
  const mpItemSoundbiteRef = useRef<typeof mpItemSoundbite>(null);
  useEffect(() => {
    mpItemSoundbiteRef.current = mpItemSoundbite;
  }, [mpItemSoundbite]);
  const mpItemChapterRef = useRef<typeof mpItemChapter>(null);
  useEffect(() => {
    mpItemChapterRef.current = mpItemChapter;
  }, [mpItemChapter]);
  const mpItemChaptersRef = useRef<typeof mpItemChapters>(null);
  useEffect(() => {
    mpItemChaptersRef.current = mpItemChapters;
  }, [mpItemChapters]);
  const mpShouldPlayRef = useRef<typeof mpShouldPlay>(null);
  useEffect(() => {
    mpShouldPlayRef.current = mpShouldPlay;
  }, [mpShouldPlay]);
  const mpIsPlayingRef = useRef(mpIsPlaying);
  useEffect(() => {
    mpIsPlayingRef.current = mpIsPlaying;
  }, [mpIsPlaying]);
  const activePlaybackTargetRef = useRef(activePlaybackTarget);
  useEffect(() => {
    activePlaybackTargetRef.current = activePlaybackTarget;
  }, [activePlaybackTarget]);
  const queueResourcesAbridgedIndexRef = useRef(queueResourcesAbridgedIndex);
  useEffect(() => {
    queueResourcesAbridgedIndexRef.current = queueResourcesAbridgedIndex;
  }, [queueResourcesAbridgedIndex]);

  const pendingPlaybackDecisionRef = useRef<PlaybackLoadDecision | null>(null);
  pendingPlaybackDecisionRef.current = pendingPlaybackDecision;

  const playbackElapsedRef = useRef(0);
  const lastPlaybackTimeRef = useRef<number | null>(null);
  const suppressNextSeekEventRef = useRef(false);
  const internalSeekResetTimerRef = useRef<number | null>(null);

  const bridgeRef = useRef<MediaElementBridge | null>(null);

  const onVideoAspectRatioChangeRef = useRef(onVideoAspectRatioChange);
  useEffect(() => {
    onVideoAspectRatioChangeRef.current = onVideoAspectRatioChange;
  }, [onVideoAspectRatioChange]);

  useEffect(() => {
    return () => {
      if (internalSeekResetTimerRef.current !== null) {
        window.clearTimeout(internalSeekResetTimerRef.current);
      }
    };
  }, []);

  const markInternalSeek = useCallback(() => {
    suppressNextSeekEventRef.current = true;
    if (internalSeekResetTimerRef.current !== null) {
      window.clearTimeout(internalSeekResetTimerRef.current);
    }
    internalSeekResetTimerRef.current = window.setTimeout(() => {
      suppressNextSeekEventRef.current = false;
      internalSeekResetTimerRef.current = null;
    }, 500);
  }, []);

  const seekInternally = useCallback(
    (seconds: number) => {
      markInternalSeek();
      bridgeRef.current?.seek(seconds);
    },
    [markInternalSeek]
  );

  const finishEmbedPlayback = useCallback(() => {
    const boundaryParams = {
      activePlaybackTarget: activePlaybackTargetRef.current,
      mpClip: mpClipRef.current,
      mpItemSoundbite: mpItemSoundbiteRef.current,
    };
    const resetSeconds = resolveEmbedPlaybackResetSeconds(boundaryParams);
    setMPIsPlaying(false);
    setMPShouldPlay(false);
    seekInternally(resetSeconds);
    setMPCurrentTime(resetSeconds);
    lastPlaybackTimeRef.current = resetSeconds;
    playbackElapsedRef.current = 0;
    const pauseAtSeconds = resolveEmbedPlaybackPauseAtSeconds(boundaryParams);
    if (pauseAtSeconds !== null) {
      bridgeRef.current?.pauseAt(pauseAtSeconds);
    } else {
      bridgeRef.current?.pauseAndDisarmBoundary();
    }
  }, [seekInternally, setMPIsPlaying, setMPShouldPlay, setMPCurrentTime]);

  const applyResolvedPlaybackUrl = (url: string, continuePlayback: boolean) => {
    const media = mediaRef.current;
    const seconds =
      media !== null && Number.isFinite(media.currentTime) && media.currentTime >= 0
        ? media.currentTime
        : 0;
    bridgeRef.current?.syncHttpFileUrlRestoreSeekAndPlay({
      url,
      persistedSeekToApply: seconds,
      onRestoreSeekApplied: () => {},
      shouldPlay: continuePlayback,
      onPlayedShouldPlayClear: () => {
        setMPShouldPlay(false);
      },
    });
    if (continuePlayback) {
      setMPIsPlaying(true);
      setMPShouldPlay(true);
    }
  };

  const settlePlaybackFailure = (fallback: MPPlaybackError, mediaErrorCode: number | null) => {
    const continuePlayback = mpIsPlayingRef.current === true || mpShouldPlayRef.current === true;
    const addByRSS = mpAddByRSSRef.current;
    if (addByRSS && onAddByRSSMediaErrorRef.current) {
      const channelIdText = addByRSS.resourceData.channel_id_text;
      onAddByRSSMediaErrorRef.current({
        channelIdText: typeof channelIdText === 'string' ? channelIdText : null,
        itemIdText: addByRSS.idText,
        mediaUrl: fallback.mediaUrl,
        mediaErrorCode,
        fallback,
        onResolvedPlaybackUrl: (url) => {
          applyResolvedPlaybackUrl(url, continuePlayback);
        },
      });
      return;
    }
    void (async () => {
      const decision = await decideBlockedHostPlayback({
        kind: fallback.kind,
        mediaUrl: fallback.mediaUrl,
        identity: fallback.identity,
        credentialsProtected: false,
      });
      const identityNow = playbackErrorIdentity({
        addByRssResourceData: mpAddByRSSRef.current?.resourceData ?? null,
        itemIdText: mpItemRef.current?.id_text ?? null,
        clipIdText: mpClipRef.current?.id_text ?? null,
        soundbiteIdText: mpItemSoundbiteRef.current?.id_text ?? null,
      });
      if (identityNow !== fallback.identity) {
        return;
      }
      if (decision.type === 'reload') {
        applyResolvedPlaybackUrl(decision.url, continuePlayback);
        return;
      }
      if (decision.type === 'report') {
        reportPlaybackErrorRef.current?.({
          ...fallback,
          kind: decision.kind,
          message: decision.detail,
          ...(decision.httpStatus === undefined ? {} : { httpStatus: decision.httpStatus }),
        });
        return;
      }
      reportPlaybackErrorRef.current?.(fallback);
    })();
  };

  const loadListenSession = (directive: ListenSessionDirective, newDuration: number): void => {
    const isAddByRSS = Boolean(mpAddByRSSRef.current);
    webListenSession.load({
      directive: isAddByRSS ? 'none' : directive,
      target: listenSessionTargetFromPlayerState({
        isAddByRSS,
        clip: mpClipRef.current ?? null,
        item: mpItemRef.current ?? null,
        soundbite: mpItemSoundbiteRef.current ?? null,
      }),
      mediaDurationSeconds: Number.isFinite(newDuration) && newDuration > 0 ? newDuration : null,
    });
  };

  const bridge = useMediaElementBridge(mediaRef, {
    onError(error) {
      if (!error) {
        return;
      }
      const kind = mediaErrorKind(error.code);
      if (kind === null) {
        return;
      }
      const mediaUrl = mediaRef.current?.currentSrc || mediaRef.current?.src || null;
      const fallback = playbackErrorForLoadedItem({
        kind,
        code: mediaErrorCodeLabel(error.code),
        message: error.message,
        mediaUrl,
        addByRss: mpAddByRSSRef.current,
        item: mpItemRef.current,
        clip: mpClipRef.current,
        soundbite: mpItemSoundbiteRef.current,
      });
      if (fallback === null) {
        return;
      }
      settlePlaybackFailure(fallback, error.code);
    },
    onPlaying() {
      setMPPlaybackError?.(null);
    },
    onPlayRejected(error) {
      crossDevicePlaybackStore.notifyLocalPlayRejected(error);
      const kind = playRejectionKind(error);
      if (kind === null) {
        return;
      }
      const detail = playRejectionDetail(error);
      const playbackError = playbackErrorForLoadedItem({
        kind,
        code: detail.code,
        message: detail.message,
        mediaUrl: mediaRef.current?.currentSrc || mediaRef.current?.src || null,
        addByRss: mpAddByRSSRef.current,
        item: mpItemRef.current,
        clip: mpClipRef.current,
        soundbite: mpItemSoundbiteRef.current,
      });
      if (playbackError !== null) {
        settlePlaybackFailure(playbackError, null);
      }
    },
    onInvalidSource() {
      const playbackError = playbackErrorForLoadedItem({
        kind: 'invalid-source',
        code: 'invalid-source',
        message: '',
        mediaUrl: null,
        addByRss: mpAddByRSSRef.current,
        item: mpItemRef.current,
        clip: mpClipRef.current,
        soundbite: mpItemSoundbiteRef.current,
      });
      if (playbackError !== null) {
        reportPlaybackErrorRef.current?.(playbackError);
      }
    },
    onLoadedMetadata(newDuration) {
      if (!mediaRef.current) {
        return;
      }
      if (mediaType === 'video' && mediaRef.current instanceof HTMLVideoElement) {
        onVideoAspectRatioChangeRef.current?.(resolveModalVideoAspectRatio(mediaRef.current));
      }
      if (isPlayerResourceLive({ mpItem: mpItemRef.current, mpAddByRSS: mpAddByRSSRef.current })) {
        bridgeRef.current?.pauseAt(-1);
        setMPDuration(0);
        if (mpShouldPlayRef.current === true) {
          updateNowPlaying({
            mpChannel: mpChannelRef.current,
            mpClip: mpClipRef.current,
            mpItem: mpItemRef.current,
            mpItemSoundbite: mpItemSoundbiteRef.current,
            mpDuration: 0,
            mpCurrentTime: 0,
            eventKind: 'play',
          });
        }
        setPendingPlaybackDecision?.(null);
        loadListenSession('none', 0);
        return;
      }
      const commandStartSeconds = takeCommandStartSeek({
        ref: buildPlaybackResourceRefFromPlayer({
          mpAddByRSS: mpAddByRSSRef.current,
          mpChannel: mpChannelRef.current,
          mpItem: mpItemRef.current,
          mpClip: mpClipRef.current,
          mpItemSoundbite: mpItemSoundbiteRef.current,
          mpItemChapter: mpItemChapterRef.current,
          mpItemChapters: null,
        }),
        fileDurationSeconds: newDuration,
        nowMs: Date.now(),
      });
      const stagedDecision = pendingPlaybackDecisionRef.current;

      if (stagedDecision !== null && stagedDecision !== undefined) {
        const initialSeekSeconds =
          commandStartSeconds ??
          (stagedDecision.reason === 'enclosure-switch-resume'
            ? clampNearEndSeconds({
                currentSeconds: stagedDecision.initialSeekSeconds,
                durationSeconds: newDuration,
              })
            : stagedDecision.initialSeekSeconds);

        seekInternally(initialSeekSeconds);
        if (typeof stagedDecision.pauseAtSeconds === 'number') {
          bridgeRef.current?.pauseAt(stagedDecision.pauseAtSeconds);
        } else {
          bridgeRef.current?.pauseAt(-1);
        }

        setMPDuration(newDuration);
        setMPCurrentTime(initialSeekSeconds);
        // A paused load must not stamp last_played_at. Play writes the listen when playback starts.
        if (mpShouldPlayRef.current === true) {
          updateNowPlaying({
            mpChannel: mpChannelRef.current,
            mpClip: mpClipRef.current,
            mpItem: mpItemRef.current,
            mpItemSoundbite: mpItemSoundbiteRef.current,
            mpDuration: newDuration,
            mpCurrentTime: initialSeekSeconds,
            eventKind: 'play',
          });
        }

        setPendingPlaybackDecision?.(null);

        loadListenSession(stagedDecision.listenSession, newDuration);
        return;
      }

      let newCurrentTime: number | null = null;

      if (mpClipRef.current) {
        newCurrentTime = Number(mpClipRef.current.start_time);
      } else if (mpItemSoundbiteRef.current) {
        newCurrentTime = Number(mpItemSoundbiteRef.current.start_time);
      } else if (mpItemChapterRef.current) {
        newCurrentTime = Number(mpItemChapterRef.current.start_time);
      } else if (mpItemRef.current) {
        if (mpChannelRef.current?.medium_id === MediumEnum.Music) {
          newCurrentTime = 0;
        } else {
          const queueResourceAbridged =
            queueResourcesAbridgedIndexRef.current.items[mpItemRef.current.id];
          const storedPosition = Number(queueResourceAbridged?.p);
          const storedDuration = Number(queueResourceAbridged?.d);
          if (storedPosition > 0) {
            const effectiveDuration = storedDuration > 0 ? storedDuration : newDuration;
            if (effectiveDuration > 0 && storedPosition >= effectiveDuration - 5) {
              newCurrentTime = 0;
            } else {
              newCurrentTime = storedPosition;
            }
          } else {
            newCurrentTime = 0;
          }
        }
      }

      if (commandStartSeconds !== null) {
        newCurrentTime = commandStartSeconds;
      }

      if (
        (commandStartSeconds !== null ||
          mpClipRef.current ||
          mpItemSoundbiteRef.current ||
          mpItemRef.current) &&
        newCurrentTime !== null
      ) {
        seekInternally(newCurrentTime);
      }

      setMPDuration(newDuration);
      // A paused load must not stamp last_played_at. Play writes the listen when playback starts.
      if (mpShouldPlayRef.current === true) {
        updateNowPlaying({
          mpChannel: mpChannelRef.current,
          mpClip: mpClipRef.current,
          mpItem: mpItemRef.current,
          mpItemSoundbite: mpItemSoundbiteRef.current,
          mpDuration: newDuration,
          mpCurrentTime: newCurrentTime !== null ? newCurrentTime : 0,
          eventKind: 'play',
        });
      }

      loadListenSession('start', newDuration);
    },
    onPlay() {
      // Media events are queued, so a fast pause-then-play can deliver `pause` after the element
      // is playing again (and the reverse). Acting on a stale event flips `mpIsPlaying` back, the
      // `mpIsPlaying` effect drives the element the other way, and the two feed each other forever.
      // `onPause` applies the same guard.
      if (!mediaRef.current || mediaRef.current.paused) {
        return;
      }
      const newCurrentTime = mediaRef.current.currentTime;
      if (mpAddByRSSRef.current && onAddByRSSPositionSaveRef.current) {
        try {
          onAddByRSSPositionSaveRef.current(newCurrentTime, 'play');
        } catch {
          // Best-effort; do not block play state
        }
      }
      if (newCurrentTime < mediaRef.current.duration) {
        updateNowPlaying({
          mpChannel: mpChannelRef.current,
          mpClip: mpClipRef.current,
          mpItem: mpItemRef.current,
          mpItemSoundbite: mpItemSoundbiteRef.current,
          mpCurrentTime: newCurrentTime,
          eventKind: 'play',
        });
        playbackElapsedRef.current = 0;
        lastPlaybackTimeRef.current = newCurrentTime;
      }
      setMPIsPlaying(true);
    },
    onSeeked() {
      if (!mediaRef.current) {
        return;
      }
      webListenSession.recordSeek();
      if (suppressNextSeekEventRef.current) {
        suppressNextSeekEventRef.current = false;
        return;
      }

      const newCurrentTime = mediaRef.current.currentTime;
      if (!Number.isFinite(newCurrentTime)) {
        return;
      }

      if (mpAddByRSSRef.current && onAddByRSSPositionSaveRef.current) {
        try {
          onAddByRSSPositionSaveRef.current(newCurrentTime, 'seek');
        } catch {
          // Best-effort; do not block seek handling
        }
      }

      updateNowPlaying({
        mpChannel: mpChannelRef.current,
        mpClip: mpClipRef.current,
        mpItem: mpItemRef.current,
        mpItemSoundbite: mpItemSoundbiteRef.current,
        mpCurrentTime: newCurrentTime,
        eventKind: 'seek',
      });
    },
    onPause() {
      if (!mediaRef.current || !mediaRef.current.paused) {
        return;
      }
      webListenSession.recordPause();
      const newCurrentTime = mediaRef.current.currentTime;
      if (mpAddByRSSRef.current && onAddByRSSPositionSaveRef.current) {
        try {
          onAddByRSSPositionSaveRef.current(newCurrentTime, 'pause');
        } catch {
          // Best-effort; do not block pause state
        }
      }
      if (newCurrentTime < mediaRef.current.duration) {
        updateNowPlaying({
          mpChannel: mpChannelRef.current,
          mpClip: mpClipRef.current,
          mpItem: mpItemRef.current,
          mpItemSoundbite: mpItemSoundbiteRef.current,
          mpCurrentTime: newCurrentTime,
          eventKind: 'pause',
        });
        playbackElapsedRef.current = 0;
        lastPlaybackTimeRef.current = null;
      }
      setMPIsPlaying(false);
    },
    onTimeUpdate(newCurrentTime) {
      if (!mediaRef.current) {
        return;
      }

      webListenSession.recordPosition({
        positionSeconds: newCurrentTime,
        isPlaying: !mediaRef.current.paused,
        playbackRate: mediaRef.current.playbackRate,
      });

      const shouldUpdateCurrentTime = !mpAddByRSSRef.current || !mediaRef.current.paused;
      if (shouldUpdateCurrentTime) {
        setMPCurrentTime(newCurrentTime);
      }

      if (lastPlaybackTimeRef.current !== null) {
        const delta = newCurrentTime - lastPlaybackTimeRef.current;
        if (delta > 0) {
          playbackElapsedRef.current += delta;
        }
      }
      lastPlaybackTimeRef.current = newCurrentTime;

      if (playbackElapsedRef.current >= 15) {
        if (mpAddByRSSRef.current && onAddByRSSPositionSaveRef.current) {
          try {
            onAddByRSSPositionSaveRef.current(
              newCurrentTime,
              'progress_tick',
              mpIsPlayingRef.current
            );
          } catch {
            // Best-effort; do not block timeupdate
          }
        }
        updateNowPlaying({
          mpChannel: mpChannelRef.current,
          mpClip: mpClipRef.current,
          mpItem: mpItemRef.current,
          mpItemSoundbite: mpItemSoundbiteRef.current,
          mpCurrentTime: newCurrentTime,
          eventKind: 'progress_tick',
          isPlaying: mpIsPlayingRef.current,
        });
        playbackElapsedRef.current = 0;
      }

      if (mpClipRef.current && mpClipRef.current.end_time) {
        const endTimeNum =
          typeof mpClipRef.current.end_time === 'string'
            ? parseFloat(mpClipRef.current.end_time)
            : mpClipRef.current.end_time;
        const endTimeNumAdjusted = endTimeNum + 1;
        if (!isNaN(endTimeNumAdjusted) && newCurrentTime >= endTimeNumAdjusted) {
          setMPClip(null);
          setMPIsPlaying(false);
          bridgeRef.current?.pauseAndDisarmBoundary();
        }
      }

      if (mpItemSoundbiteRef.current && mpItemSoundbiteRef.current.duration) {
        const startNum =
          typeof mpItemSoundbiteRef.current.start_time === 'string'
            ? parseFloat(mpItemSoundbiteRef.current.start_time)
            : mpItemSoundbiteRef.current.start_time;
        const durationNum =
          typeof mpItemSoundbiteRef.current.duration === 'string'
            ? parseFloat(mpItemSoundbiteRef.current.duration)
            : mpItemSoundbiteRef.current.duration;
        const endTimeNum = startNum + durationNum;
        const endTimeNumAdjusted = endTimeNum + 1;
        if (!isNaN(endTimeNumAdjusted) && newCurrentTime >= endTimeNumAdjusted) {
          setMPItemSoundbite(null);
          setMPIsPlaying(false);
          bridgeRef.current?.pauseAndDisarmBoundary();
        }
      }

      if (isEmbedRouteRef.current) {
        const pauseAtSeconds = resolveEmbedPlaybackPauseAtSeconds({
          activePlaybackTarget: activePlaybackTargetRef.current,
          mpClip: null,
          mpItemSoundbite: null,
        });
        if (pauseAtSeconds !== null && newCurrentTime >= pauseAtSeconds && mpIsPlayingRef.current) {
          finishEmbedPlayback();
        }
      }

      if (!mpItemSoundbiteRef.current && !mpClipRef.current) {
        const list = mpItemChaptersRef.current;
        if (Array.isArray(list) && list.length > 0) {
          const selectedChapter = selectItemChapterForTime(list, newCurrentTime);
          if (selectedChapter) {
            if (!mpItemChapterRef.current || mpItemChapterRef.current.id !== selectedChapter.id) {
              setMPItemChapter(selectedChapter);
            }
          } else if (mpItemChapterRef.current) {
            setMPItemChapter(null);
          }
        }
      }
    },
    onEnded() {
      if (
        !shouldAdvanceQueueAfterEnded({
          mediaErrorCode: mediaRef.current?.error?.code ?? null,
          playbackError: mpPlaybackErrorRef.current,
        })
      ) {
        return;
      }
      webListenSession.recordCompleted();
      void (async () => {
        if (isEmbedRouteRef.current) {
          if (notifyEmbedListItemEnded()) {
            return;
          }

          finishEmbedPlayback();
          return;
        }
        if (mpAddByRSSRef.current && onAddByRSSEndedRef.current) {
          if (!mediaRef.current) {
            return;
          }
          const positionSeconds = mediaRef.current.currentTime;
          const medium_id =
            typeof mpAddByRSSRef.current.resourceData?.medium_id === 'number'
              ? mpAddByRSSRef.current.resourceData.medium_id
              : undefined;
          await onAddByRSSEndedRef.current(positionSeconds);
          setMPShouldPlay(false);
          pendingMusicQueueLoadIntentRef.current = 'fresh_transition';
          const { upcomingManualCount } = await queueResourcesLoadActive(medium_id);
          if (upcomingManualCount > 0) {
            return;
          }
          const playedNext = onAddByRSSPlayNextRef.current
            ? await onAddByRSSPlayNextRef.current()
            : false;
          if (!playedNext) {
            clearNowPlayingRef.current?.();
          }
          return;
        }
        await moveNowPlayingToHistory({
          completed: true,
          mpClip: mpClipRef.current,
          mpItem: mpItemRef.current,
          mpItemSoundbite: mpItemSoundbiteRef.current,
        });
        pendingMusicQueueLoadIntentRef.current = 'fresh_transition';
        const { upcomingManualCount, hasAutoQueueNext } = await queueResourcesLoadActive();
        if (upcomingManualCount === 0 && !hasAutoQueueNext) {
          clearNowPlayingRef.current?.();
          return;
        }
        if (upcomingManualCount > 0 || hasAutoQueueNext) {
          setMPShouldPlay(true);
        }
      })();
    },
  });
  bridgeRef.current = bridge;
  useRegisterMediaPlayerControlsBridge(bridge);

  const prevSelectedRef = useRef<SelectedLabeledItemEnclosureAndSource | null>(null);

  const selectedItemEnclosureAndSource = useMemo(() => {
    const next = getSelectedLabeledItemEnclosureAndSource({
      labeledItemEnclosures: mpItemLabeledEnclosures,
      type: mpEnclosureSelectedParams.type,
      enclosureRowIndex: mpEnclosureSelectedParams.enclosureRowSelected,
      sourceRowIndex: mpEnclosureSelectedParams.sourceRowSelected,
    });
    if (isEqual(prevSelectedRef.current, next)) {
      return prevSelectedRef.current;
    }
    prevSelectedRef.current = next;
    return next;
  }, [mpItemLabeledEnclosures, mpEnclosureSelectedParams]);

  const addByRSSSelectedMediaType =
    mpAddByRSS && mpItemLabeledEnclosures.length > 0
      ? (selectedItemEnclosureAndSource?.labeledItemEnclosure?.mediaType ?? null)
      : null;

  useEffect(() => {
    if (!mediaRef.current || !mpAddByRSS?.resourceData) return;

    const mediumId = mpAddByRSS.resourceData.medium_id;
    const addByRSSMediaType =
      addByRSSSelectedMediaType ?? (mediumId === MediumEnum.Video ? 'video' : 'audio');
    if (mediaType === 'audio' && addByRSSMediaType === 'video' && !allowVideoOnAudioOrchestrator) {
      return;
    }
    if (mediaType === 'video' && addByRSSMediaType !== 'video') return;

    let url: string;
    if (mpItemLabeledEnclosures.length > 0) {
      const selected = getSelectedLabeledItemEnclosureAndSource({
        labeledItemEnclosures: mpItemLabeledEnclosures,
        type: mpEnclosureSelectedParams.type,
        enclosureRowIndex: mpEnclosureSelectedParams.enclosureRowSelected,
        sourceRowIndex: mpEnclosureSelectedParams.sourceRowSelected,
      });
      const uri = selected?.source?.uri;
      if (typeof uri !== 'string' || uri.trim() === '') {
        const playbackError = playbackErrorForLoadedItem({
          kind: 'invalid-source',
          code: 'invalid-source',
          message: '',
          mediaUrl: null,
          addByRss: mpAddByRSS,
          item: mpItemRef.current,
          clip: mpClipRef.current,
          soundbite: mpItemSoundbiteRef.current,
        });
        if (playbackError !== null) {
          reportPlaybackErrorRef.current?.(playbackError);
        }
        return;
      }
      url = uri.trim();
    } else {
      const enclosureUrl = mpAddByRSS.resourceData.enclosure_url;
      if (typeof enclosureUrl !== 'string' || enclosureUrl.trim() === '') {
        const playbackError = playbackErrorForLoadedItem({
          kind: 'invalid-source',
          code: 'invalid-source',
          message: '',
          mediaUrl: null,
          addByRss: mpAddByRSS,
          item: mpItemRef.current,
          clip: mpClipRef.current,
          soundbite: mpItemSoundbiteRef.current,
        });
        if (playbackError !== null) {
          reportPlaybackErrorRef.current?.(playbackError);
        }
        return;
      }
      url = enclosureUrl.trim();
    }
    const playbackIdentity = playbackErrorIdentity({
      addByRssResourceData: mpAddByRSS.resourceData,
      itemIdText: mpItemRef.current?.id_text ?? null,
      clipIdText: mpClipRef.current?.id_text ?? null,
      soundbiteIdText: mpItemSoundbiteRef.current?.id_text ?? null,
    });
    const resolvedUrl =
      playbackIdentity === null ? null : resolvedPlaybackUrlForIdentity(playbackIdentity);
    if (resolvedUrl !== null) {
      url = resolvedUrl;
    }
    const enclosureSwitchDecision =
      pendingPlaybackDecisionRef.current?.reason === 'enclosure-switch-resume'
        ? pendingPlaybackDecisionRef.current
        : null;
    const persistedSeekToApply =
      addByRSSSeekToTime !== null
        ? addByRSSSeekToTime >= 0
          ? addByRSSSeekToTime
          : 0
        : enclosureSwitchDecision !== null
          ? enclosureSwitchDecision.initialSeekSeconds
          : null;

    if (persistedSeekToApply !== null) {
      markInternalSeek();
    }

    bridge.syncHttpFileUrlRestoreSeekAndPlay({
      url,
      persistedSeekToApply,
      onRestoreSeekApplied: () => {
        setAddByRSSSeekToTime(null);
        if (enclosureSwitchDecision !== null) {
          setPendingPlaybackDecision?.(null);
        }
      },
      shouldPlay: enclosureSwitchDecision !== null ? mpIsPlayingRef.current : mpShouldPlay,
      onPlayedShouldPlayClear: () => {
        setMPShouldPlay(false);
      },
    });
  }, [
    mpAddByRSS,
    mediaType,
    mpShouldPlay,
    addByRSSSeekToTime,
    setAddByRSSSeekToTime,
    mpItemLabeledEnclosures,
    mpEnclosureSelectedParams,
    addByRSSSelectedMediaType,
    markInternalSeek,
  ]);

  useEffect(() => {
    const isAddByRSSWithNoEnclosures = mpAddByRSS && mpItemLabeledEnclosures.length === 0;
    if (isAddByRSSWithNoEnclosures) return;
    if (!selectedItemEnclosureAndSource) {
      return;
    }
    const rawUri = selectedItemEnclosureAndSource.source?.uri;
    if (typeof rawUri !== 'string' || rawUri.trim() === '') {
      return;
    }
    const enclosureType = selectedItemEnclosureAndSource.labeledItemEnclosure?.enclosure?.type;
    const trimmedType = typeof enclosureType === 'string' ? enclosureType.trim() : '';
    const sourceContentType = selectedItemEnclosureAndSource.source?.content_type;
    const sourceMime =
      typeof sourceContentType === 'string' && sourceContentType.trim() !== ''
        ? sourceContentType
        : null;
    const classificationMime = trimmedType !== '' ? trimmedType : sourceMime;
    const hlsPlaylistAttachment = isHlsSource(rawUri, classificationMime);
    if (trimmedType === '' && !hlsPlaylistAttachment) {
      return;
    }

    const isAudioFile = checkIfIsAudioFile(selectedItemEnclosureAndSource);
    const isVideoFile = checkIfIsVideoFile(selectedItemEnclosureAndSource);
    const isLiveItem = checkIsLiveItem(mpItemRef.current);

    bridge.applyItemEnclosureSurfaceChange({
      hlsPlaylistAttachment,
      treatAsActiveNonLiveFile:
        (mediaType === 'audio'
          ? isAudioFile || (allowVideoOnAudioOrchestrator && isVideoFile)
          : isVideoFile) && !isLiveItem,
      shouldPlayWhenReady: mpIsPlayingRef.current === true,
      onPlayedShouldPlayClear: () => {
        setMPShouldPlay(false);
      },
    });
  }, [mpAddByRSS, mpItemLabeledEnclosures.length, selectedItemEnclosureAndSource, mediaType]);

  useEffect(() => {
    if (playbackError !== null) {
      bridge.pause();
      return;
    }
    if (!mpIsPlaying) {
      bridge.pause();
      return;
    }
    let cancelled = false;
    void (async () => {
      await waitForPlayableMediaSource(
        () => mediaRef.current,
        () => cancelled
      );
      if (cancelled || mpIsPlayingRef.current !== true) {
        return;
      }
      // The live controller plays live items. This element has no source for one, and asking it
      // to play would report an invalid source that stops the live stream.
      if (checkIsLiveItem(mpItemRef.current)) {
        return;
      }
      const media = mediaRef.current;
      if (media !== null && liveMediaStore.prepareResume(media) === 'reconnecting') {
        return;
      }
      await bridge.play();
    })();

    return () => {
      cancelled = true;
    };
  }, [mpIsPlaying, playbackError, bridge]);

  useEffect(() => {
    bridge.setVolume(mpVolume);
  }, [mpVolume, bridge]);

  useEffect(() => {
    bridge.setMuted(mpIsMuted);
  }, [mpIsMuted, bridge]);

  useEffect(() => {
    bridge.setPlaybackRate(mpPlaybackSpeed);
  }, [mpPlaybackSpeed, bridge]);

  useEffect(() => {
    const playWhenReady = async () => {
      if (mpClip && mediaRef.current) {
        markInternalSeek();
        bridge.seek(Number(mpClip.start_time));
        if (mpShouldPlayRef.current) {
          const uri = await waitForSourceUri(mediaRef.current, 1000, 50);
          if (uri) {
            void bridge.play().then(() => setMPShouldPlay(false));
          }
        }
        if (mpClip.end_time) {
          bridge.pauseAt(Number(mpClip.end_time));
        }
      }
      if (mpItemChapter && mediaRef.current) {
        if (mpItemChapterShouldSeek) {
          setMPItemChapterShouldSeek(false);
          markInternalSeek();
          bridge.seek(Number(mpItemChapter.start_time));
          if (mpShouldPlayRef.current) {
            const uri = await waitForSourceUri(mediaRef.current, 1000, 50);
            if (uri) {
              void bridge.play().then(() => setMPShouldPlay(false));
            }
          }
        }
        if (mpItemChapter.end_time) {
          bridge.pauseAt(-1);
        }
      }
      if (mpItemSoundbite && mediaRef.current) {
        markInternalSeek();
        bridge.seek(Number(mpItemSoundbite.start_time));
        if (mpShouldPlayRef.current) {
          const uri = await waitForSourceUri(mediaRef.current, 1000, 50);
          if (uri) {
            void bridge.play().then(() => setMPShouldPlay(false));
          }
        }
        if (mpItemSoundbite.duration) {
          bridge.pauseAt(Number(mpItemSoundbite.start_time) + Number(mpItemSoundbite.duration) + 1);
        }
      }
    };

    void playWhenReady();
  }, [
    mpClip,
    mpItemChapter,
    mpItemSoundbite,
    bridge,
    markInternalSeek,
    mpItemChapterShouldSeek,
    setMPItemChapterShouldSeek,
  ]);

  const addByRSSEnclosureUrl = (() => {
    if (!mpAddByRSS?.resourceData) return undefined;
    const addByRSSMediaType =
      addByRSSSelectedMediaType ??
      (mpAddByRSS.resourceData.medium_id === MediumEnum.Video ? 'video' : 'audio');
    const mediumMatch = mediaType === addByRSSMediaType;
    if (!mediumMatch) return undefined;
    if (mpItemLabeledEnclosures.length > 0) {
      const uri = selectedItemEnclosureAndSource?.source?.uri;
      if (typeof uri === 'string' && uri.trim() !== '') {
        return uri.trim();
      }
    }
    const fallback = mpAddByRSS.resourceData.enclosure_url;
    return typeof fallback === 'string' && fallback.trim() !== '' ? fallback.trim() : undefined;
  })();
  const rawSourceUri =
    addByRSSEnclosureUrl ?? selectedItemEnclosureAndSource?.source?.uri ?? undefined;
  const sourceUri =
    typeof rawSourceUri === 'string' && rawSourceUri.trim() !== ''
      ? rawSourceUri.trim()
      : undefined;
  const selectedUri = selectedItemEnclosureAndSource?.source?.uri?.trim() ?? '';
  const sourceMime =
    sourceUri !== undefined && sourceUri === selectedUri
      ? selectedItemEnclosureAndSource?.labeledItemEnclosure?.enclosure.type
      : undefined;
  // Database live items play only in the live controller.
  const elementSource: MediaElementSource | null =
    sourceUri !== undefined && !checkIsLiveItem(mpItem)
      ? toFileMediaElementSource(sourceUri, sourceMime)
      : null;

  // An Add by RSS livestream plays on this element, which keeps its credential and blocked-host
  // handling, and shares the live position store with database livestreams.
  const isAddByRSSLive = mpAddByRSS !== null && isPlayerResourceLive({ mpItem: null, mpAddByRSS });
  const elementDelivery = elementSource?.delivery ?? 'file';
  useEffect(() => {
    const media = mediaRef.current;
    if (!isAddByRSSLive || addByRSSEnclosureUrl === undefined || media === null) {
      return;
    }
    return liveMediaStore.register({
      media,
      delivery: elementDelivery,
      reconnect: () => {
        bridgeRef.current?.reloadAt(0);
      },
    });
  }, [isAddByRSSLive, addByRSSEnclosureUrl, elementDelivery]);

  useEffect(() => {
    if (mediaType !== 'video') {
      return;
    }

    const reportAspectRatio = () => {
      const el = mediaRef.current;
      if (!(el instanceof HTMLVideoElement)) {
        onVideoAspectRatioChangeRef.current?.(null);
        return;
      }
      onVideoAspectRatioChangeRef.current?.(resolveModalVideoAspectRatio(el));
    };

    onVideoAspectRatioChangeRef.current?.(null);
    reportAspectRatio();

    const el = mediaRef.current;
    if (!el) {
      return;
    }

    el.addEventListener('loadedmetadata', reportAspectRatio);
    el.addEventListener('resize', reportAspectRatio);

    return () => {
      el.removeEventListener('loadedmetadata', reportAspectRatio);
      el.removeEventListener('resize', reportAspectRatio);
    };
  }, [mediaType, sourceUri]);

  return (
    <MediaElement
      isVideo={mediaType === 'video'}
      mediaRef={mediaRef}
      source={elementSource}
      preload={preload}
      hidden={hidden}
      style={style}
    />
  );
};
