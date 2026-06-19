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
import { getSelectedLabeledItemEnclosureAndSource, isEqual, MediumEnum } from '@podverse/helpers';

import { useAccount } from '../../../contexts/Account';
import { useEmbedPlaybackGuardrails } from '../../../contexts/EmbedPlaybackMode';
import type { MediaPlayerAddByRSSState } from '../../../contexts/MediaPlayer';
import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useRegisterMediaPlayerControlsBridge } from '../../../contexts/MediaPlayerControls';
import type { MediaElementBridge, MediaElementSource } from '../../../hooks/useMediaElementBridge';
import { useMediaElementBridge } from '../../../hooks/useMediaElementBridge';
import type { MoveNowPlayingToHistoryCallbackParams } from '../../../hooks/useQueueResourceMoveNowPlayingToHistory';
import type { QueueResourcesLoadActiveResult } from '../../../hooks/useQueueResourcesLoadActive';
import type { UpdateNowPlayingParams } from '../../../hooks/useQueueResourceUpdateNowPlaying';
import { notifyEmbedListItemEnded } from '../../../lib/embed/embedListPlaybackAdvance';
import {
  resolveEmbedPlaybackPauseAtSeconds,
  resolveEmbedPlaybackResetSeconds,
} from '../../../lib/embed/resolveEmbedPlaybackResetSeconds';
import type { MusicItemPlaybackIntent, PlaybackLoadDecision } from '../../../lib/playback';
import { clampNearEndSeconds } from '../../../lib/playback/clampNearEndSeconds';
import {
  checkIfIsAudioFile,
  checkIfIsVideoFile,
  checkIsLiveItem,
} from '../../../utils/mediaPlayer/mediaPlayerItemEnclosureType';
import { waitForSourceUri } from '../../../utils/mediaPlayer/mediaPlayerPlayMediaWhenReady';
import { resolveModalVideoAspectRatio } from '../../../utils/mediaPlayer/modalVideoAspectRatio';
import { selectItemChapterForTime } from '../../../utils/mediaPlayer/selectItemChapterForTime';
import {
  trackStatsChannel,
  trackStatsClip,
  trackStatsItem,
} from '../../../utils/statsTracking/statsTracking';
import { MediaElement } from '../MediaElement/MediaElement';

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
  onAddByRSSPositionSave?: (positionSeconds: number) => void;
  /** When add-by-RSS playback ends, called to add to history; then controller clears add-by-RSS state. */
  onAddByRSSEnded?: (positionSeconds: number) => Promise<void>;
  /** When add-by-RSS playback ends and queue is empty, try to play next from list context. Returns true if playback started. */
  onAddByRSSPlayNext?: () => Promise<boolean>;
  clearNowPlaying: () => void;
  /** Set to `fresh_transition` before skip/ended queue loads so music advances start at 0. */
  pendingMusicQueueLoadIntentRef: React.RefObject<MusicItemPlaybackIntent | null>;
  /** Called when the video element reports intrinsic dimensions (modal stage sizing). */
  onVideoAspectRatioChange?: (ratio: number | null) => void;
}

export const NonLiveMediaOrchestrator: React.FC<NonLiveMediaOrchestratorProps> = (props) => {
  const { loggedInAccount } = useAccount();
  const { embedPlayerSize, isEmbedRoute } = useEmbedPlaybackGuardrails();
  const { activePlaybackTarget } = useMediaPlayer();
  const loggedInAccountRef = useRef(loggedInAccount);
  useEffect(() => {
    loggedInAccountRef.current = loggedInAccount;
  }, [loggedInAccount]);

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

  const bridgeRef = useRef<MediaElementBridge | null>(null);

  const onVideoAspectRatioChangeRef = useRef(onVideoAspectRatioChange);
  useEffect(() => {
    onVideoAspectRatioChangeRef.current = onVideoAspectRatioChange;
  }, [onVideoAspectRatioChange]);

  const finishEmbedPlayback = useCallback(() => {
    const boundaryParams = {
      activePlaybackTarget: activePlaybackTargetRef.current,
      mpClip: mpClipRef.current,
      mpItemSoundbite: mpItemSoundbiteRef.current,
    };
    const resetSeconds = resolveEmbedPlaybackResetSeconds(boundaryParams);
    setMPIsPlaying(false);
    setMPShouldPlay(false);
    bridgeRef.current?.seek(resetSeconds);
    setMPCurrentTime(resetSeconds);
    lastPlaybackTimeRef.current = resetSeconds;
    playbackElapsedRef.current = 0;
    const pauseAtSeconds = resolveEmbedPlaybackPauseAtSeconds(boundaryParams);
    if (pauseAtSeconds !== null) {
      bridgeRef.current?.pauseAt(pauseAtSeconds);
    } else {
      bridgeRef.current?.pauseAndDisarmBoundary();
    }
  }, [setMPIsPlaying, setMPShouldPlay, setMPCurrentTime]);

  const bridge = useMediaElementBridge(mediaRef, {
    onLoadedMetadata(newDuration) {
      if (!mediaRef.current) {
        return;
      }
      if (mediaType === 'video' && mediaRef.current instanceof HTMLVideoElement) {
        onVideoAspectRatioChangeRef.current?.(resolveModalVideoAspectRatio(mediaRef.current));
      }
      const stagedDecision = pendingPlaybackDecisionRef.current;

      if (stagedDecision !== null && stagedDecision !== undefined) {
        const initialSeekSeconds =
          stagedDecision.reason === 'enclosure-switch-resume'
            ? clampNearEndSeconds({
                currentSeconds: stagedDecision.initialSeekSeconds,
                durationSeconds: newDuration,
              })
            : stagedDecision.initialSeekSeconds;

        bridgeRef.current?.seek(initialSeekSeconds);
        if (typeof stagedDecision.pauseAtSeconds === 'number') {
          bridgeRef.current?.pauseAt(stagedDecision.pauseAtSeconds);
        } else {
          bridgeRef.current?.pauseAt(-1);
        }

        setMPDuration(newDuration);
        setMPCurrentTime(initialSeekSeconds);
        updateNowPlaying({
          mpChannel: mpChannelRef.current,
          mpClip: mpClipRef.current,
          mpItem: mpItemRef.current,
          mpItemSoundbite: mpItemSoundbiteRef.current,
          mpDuration: newDuration,
          mpCurrentTime: initialSeekSeconds,
        });

        setPendingPlaybackDecision?.(null);

        if (!loggedInAccountRef.current || mpAddByRSSRef.current) {
          return;
        }
        if (!stagedDecision.shouldRecordPlaybackStat) {
          return;
        }
        if (mpChannelRef.current) {
          trackStatsChannel(mpChannelRef.current.id_text);
        }
        if (mpClipRef.current) {
          trackStatsClip(mpClipRef.current.id_text);
        }
        const itemIdText =
          mpItemRef.current?.id_text ?? mpItemSoundbiteRef.current?.item?.id_text ?? null;
        if (itemIdText) {
          trackStatsItem(itemIdText);
        }
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

      if (
        (mpClipRef.current || mpItemSoundbiteRef.current || mpItemRef.current) &&
        newCurrentTime !== null
      ) {
        bridgeRef.current?.seek(newCurrentTime);
      }

      setMPDuration(newDuration);
      updateNowPlaying({
        mpChannel: mpChannelRef.current,
        mpClip: mpClipRef.current,
        mpItem: mpItemRef.current,
        mpItemSoundbite: mpItemSoundbiteRef.current,
        mpDuration: newDuration,
        mpCurrentTime: newCurrentTime !== null ? newCurrentTime : 0,
      });

      if (!loggedInAccountRef.current || mpAddByRSSRef.current) {
        return;
      }
      if (mpChannelRef.current) {
        trackStatsChannel(mpChannelRef.current.id_text);
      }
      if (mpClipRef.current) {
        trackStatsClip(mpClipRef.current.id_text);
      }
      const itemIdText =
        mpItemRef.current?.id_text ?? mpItemSoundbiteRef.current?.item?.id_text ?? null;
      if (itemIdText) {
        trackStatsItem(itemIdText);
      }
    },
    onPlay() {
      if (!mediaRef.current) {
        return;
      }
      const newCurrentTime = mediaRef.current.currentTime;
      if (mpAddByRSSRef.current && onAddByRSSPositionSaveRef.current) {
        try {
          onAddByRSSPositionSaveRef.current(newCurrentTime);
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
        });
        playbackElapsedRef.current = 0;
        lastPlaybackTimeRef.current = newCurrentTime;
      }
      setMPIsPlaying(true);
    },
    onPause() {
      if (!mediaRef.current) {
        return;
      }
      const newCurrentTime = mediaRef.current.currentTime;
      if (mpAddByRSSRef.current && onAddByRSSPositionSaveRef.current) {
        try {
          onAddByRSSPositionSaveRef.current(newCurrentTime);
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
            onAddByRSSPositionSaveRef.current(newCurrentTime);
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
      if (typeof uri !== 'string' || uri.trim() === '') return;
      url = uri.trim();
    } else {
      const enclosureUrl = mpAddByRSS.resourceData.enclosure_url;
      if (typeof enclosureUrl !== 'string' || enclosureUrl.trim() === '') return;
      url = enclosureUrl.trim();
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
  ]);

  useEffect(() => {
    const isAddByRSSWithNoEnclosures = mpAddByRSS && mpItemLabeledEnclosures.length === 0;
    if (isAddByRSSWithNoEnclosures) return;
    if (!selectedItemEnclosureAndSource) {
      return;
    }
    if (!selectedItemEnclosureAndSource.labeledItemEnclosure?.enclosure?.type) {
      return;
    }
    if (!selectedItemEnclosureAndSource.source?.uri) {
      return;
    }

    const isAudioFile = checkIfIsAudioFile(selectedItemEnclosureAndSource);
    const isVideoFile = checkIfIsVideoFile(selectedItemEnclosureAndSource);
    const isLiveItem = checkIsLiveItem(mpItemRef.current);

    bridge.applyItemEnclosureSurfaceChange({
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
    if (mpIsPlaying) {
      void bridge.play();
    } else {
      bridge.pause();
    }
  }, [mpIsPlaying, bridge]);

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
  const sourceUri =
    addByRSSEnclosureUrl ?? selectedItemEnclosureAndSource?.source?.uri ?? undefined;
  const elementSource: MediaElementSource | null =
    typeof sourceUri === 'string' && sourceUri.trim() !== ''
      ? { kind: 'file', src: sourceUri.trim() }
      : null;

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
