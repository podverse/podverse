'use client';

import React, { useEffect, useMemo, useRef } from 'react';

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

import { EVENTS } from '../../../constants/events';
import { useAccount } from '../../../contexts/Account';
import type { MediaPlayerAddByRSSState } from '../../../contexts/MediaPlayer';
import type { MoveNowPlayingToHistoryCallbackParams } from '../../../hooks/useQueueResourceMoveNowPlayingToHistory';
import type { QueueResourcesLoadActiveResult } from '../../../hooks/useQueueResourcesLoadActive';
import type { UpdateNowPlayingParams } from '../../../hooks/useQueueResourceUpdateNowPlaying';
import {
  checkIfIsAudioFile,
  checkIfIsVideoFile,
  checkIsLiveItem,
} from '../../../utils/mediaPlayer/mediaPlayerItemEnclosureType';
import { playMediaWhenReady } from '../../../utils/mediaPlayer/mediaPlayerPlayMediaWhenReady';
import { waitForSourceUri } from '../../../utils/mediaPlayer/mediaPlayerPlayMediaWhenReady';
import { selectItemChapterForTime } from '../../../utils/mediaPlayer/selectItemChapterForTime';
import {
  trackStatsChannel,
  trackStatsClip,
  trackStatsItem,
} from '../../../utils/statsTracking/statsTracking';

export interface MediaPlayerControllerAVProps {
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
  /** When add-by-RSS is now playing, called to save position (e.g. every 15s and on pause). */
  onAddByRSSPositionSave?: (positionSeconds: number) => void;
  /** When add-by-RSS playback ends, called to add to history; then controller clears add-by-RSS state. */
  onAddByRSSEnded?: (positionSeconds: number) => Promise<void>;
  /** When add-by-RSS playback ends and queue is empty, try to play next from list context. Returns true if playback started. */
  onAddByRSSPlayNext?: () => Promise<boolean>;
  clearNowPlaying: () => void;
}

let globalPauseAtTime: number | null = null;

export const MediaPlayerControllerAV: React.FC<MediaPlayerControllerAVProps> = (props) => {
  const { loggedInAccount } = useAccount();
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
    onAddByRSSPositionSave,
    onAddByRSSEnded,
    onAddByRSSPlayNext,
    clearNowPlaying,
  } = props;

  const mediaRef = useRef<HTMLAudioElement & HTMLVideoElement>(null);

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
  const queueResourcesAbridgedIndexRef = useRef(queueResourcesAbridgedIndex);
  useEffect(() => {
    queueResourcesAbridgedIndexRef.current = queueResourcesAbridgedIndex;
  }, [queueResourcesAbridgedIndex]);

  const playbackElapsedRef = useRef(0);
  const lastPlaybackTimeRef = useRef<number | null>(null);

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
    if (mediaType === 'audio' && addByRSSMediaType === 'video') return;
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
    const isRestoredSeek = addByRSSSeekToTime !== null;
    const seekTime = isRestoredSeek && addByRSSSeekToTime >= 0 ? addByRSSSeekToTime : 0;

    // Only set src/load if not already set (e.g. declarative src from JSX may already match).
    if (mediaRef.current.src !== url) {
      mediaRef.current.src = url;
      mediaRef.current.load();
    }

    const applySeek = () => {
      if (isRestoredSeek) {
        if (mediaRef.current) {
          mediaRef.current.currentTime = seekTime;
        }
        setAddByRSSSeekToTime(null);
      }
    };

    if (mediaRef.current.readyState >= 1) {
      applySeek();
    } else {
      mediaRef.current.addEventListener('loadedmetadata', applySeek, { once: true });
    }

    if (mpShouldPlay) {
      if (mediaRef.current) {
        playMediaWhenReady(mediaRef.current, () => setMPShouldPlay(false));
      }
    }
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

    if (mediaRef.current) {
      const isAudioFile = checkIfIsAudioFile(selectedItemEnclosureAndSource);
      const isVideoFile = checkIfIsVideoFile(selectedItemEnclosureAndSource);
      const isLiveItem = checkIsLiveItem(mpItemRef.current);

      if ((mediaType === 'audio' ? isAudioFile : isVideoFile) && !isLiveItem) {
        mediaRef.current.currentTime = 0;
        mediaRef.current.load();
        if (mpShouldPlayRef.current) {
          playMediaWhenReady(mediaRef.current, () => setMPShouldPlay(false));
        }
      } else {
        mediaRef.current.pause();
        mediaRef.current.removeAttribute('src');
        mediaRef.current.load();
      }
    }
  }, [mpAddByRSS, mpItemLabeledEnclosures.length, selectedItemEnclosureAndSource]);

  useEffect(() => {
    const syncItemChapterToTime = (t: number) => {
      if (mpItemSoundbiteRef.current || mpClipRef.current) {
        return;
      }
      const chapters = mpItemChaptersRef.current;
      if (!Array.isArray(chapters) || chapters.length === 0) {
        return;
      }
      const selectedChapter = selectItemChapterForTime(chapters, t);
      if (selectedChapter) {
        if (!mpItemChapterRef.current || mpItemChapterRef.current.id !== selectedChapter.id) {
          setMPItemChapter(selectedChapter);
        }
      } else if (mpItemChapterRef.current) {
        setMPItemChapter(null);
      }
    };

    const handleSeek = (e: Event) => {
      const customEvent = e as CustomEvent<{ time: number }>;
      if (mediaRef.current && typeof customEvent.detail.time === 'number') {
        const t = customEvent.detail.time;
        mediaRef.current.currentTime = t;
        setMPCurrentTime(t);
        syncItemChapterToTime(t);
      }
    };

    const handleJumpBack = (e: Event) => {
      const customEvent = e as CustomEvent<{ seconds: number }>;
      if (mediaRef.current && typeof customEvent.detail.seconds === 'number') {
        const newTime = Math.max(mediaRef.current.currentTime - customEvent.detail.seconds, 0);
        mediaRef.current.currentTime = newTime;
        setMPCurrentTime(newTime);
        syncItemChapterToTime(newTime);
      }
    };

    const handleJumpForward = (e: Event) => {
      const customEvent = e as CustomEvent<{ seconds: number }>;
      if (
        mediaRef.current &&
        typeof customEvent.detail.seconds === 'number' &&
        typeof mediaRef.current.duration === 'number'
      ) {
        const newTime = Math.min(
          mediaRef.current.currentTime + customEvent.detail.seconds,
          mediaRef.current.duration
        );
        mediaRef.current.currentTime = newTime;
        setMPCurrentTime(newTime);
        syncItemChapterToTime(newTime);
      }
    };

    const handlePauseAt = (e: Event) => {
      const customEvent = e as CustomEvent<{ stopAt: number }>;
      if (typeof customEvent.detail.stopAt === 'number') {
        globalPauseAtTime = customEvent.detail.stopAt;
      }
    };

    window.addEventListener(EVENTS.MEDIA_PLAYER.SEEK, handleSeek);
    window.addEventListener(EVENTS.MEDIA_PLAYER.JUMP_BACK, handleJumpBack);
    window.addEventListener(EVENTS.MEDIA_PLAYER.JUMP_FORWARD, handleJumpForward);
    window.addEventListener(EVENTS.MEDIA_PLAYER.PAUSE_AT, handlePauseAt);

    return () => {
      window.removeEventListener(EVENTS.MEDIA_PLAYER.SEEK, handleSeek);
      window.removeEventListener(EVENTS.MEDIA_PLAYER.JUMP_BACK, handleJumpBack);
      window.removeEventListener(EVENTS.MEDIA_PLAYER.JUMP_FORWARD, handleJumpForward);
      window.removeEventListener(EVENTS.MEDIA_PLAYER.PAUSE_AT, handlePauseAt);
    };
  }, [setMPItemChapter]);

  useEffect(() => {
    if (!mediaRef.current) {
      return;
    }

    const handleLoadedMetadata = () => {
      if (!mediaRef.current) {
        return;
      }
      const newDuration = mediaRef.current.duration;
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
            // Mirror the near-end clamp from useMediaPlayerResourceUpdate so the
            // actual audio element does not seek past the documented `p >= d - 5`
            // reset boundary. Falls back to the live newDuration if the abridged
            // index does not yet carry a duration for this item.
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
        mediaRef.current.currentTime = newCurrentTime;
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
    };

    const handlePlay = () => {
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
    };

    const handlePause = () => {
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
    };

    const handleTimeUpdate = () => {
      if (!mediaRef.current) {
        return;
      }
      const newCurrentTime = mediaRef.current.currentTime;

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

      if (globalPauseAtTime !== null && newCurrentTime >= globalPauseAtTime) {
        setMPIsPlaying(false);
        globalPauseAtTime = null;
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
          globalPauseAtTime = null;
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
          globalPauseAtTime = null;
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
    };

    const handleEnded = async () => {
      if (mpAddByRSSRef.current && onAddByRSSEndedRef.current) {
        if (!mediaRef.current) {
          return;
        }
        const positionSeconds = mediaRef.current.currentTime;
        // Capture medium_id before potentially clearing mpAddByRSS so we can find the correct queue
        const medium_id =
          typeof mpAddByRSSRef.current.resourceData?.medium_id === 'number'
            ? mpAddByRSSRef.current.resourceData.medium_id
            : undefined;
        await onAddByRSSEndedRef.current(positionSeconds);
        setMPShouldPlay(false);
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
      const { upcomingManualCount, hasAutoQueueNext } = await queueResourcesLoadActive();
      if (upcomingManualCount === 0 && !hasAutoQueueNext) {
        clearNowPlayingRef.current?.();
        return;
      }
      if (upcomingManualCount > 0 || hasAutoQueueNext) {
        setMPShouldPlay(true);
      }
    };

    mediaRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
    mediaRef.current.addEventListener('play', handlePlay);
    mediaRef.current.addEventListener('pause', handlePause);
    mediaRef.current.addEventListener('timeupdate', handleTimeUpdate);
    mediaRef.current.addEventListener('ended', handleEnded);

    return () => {
      if (mediaRef.current) {
        mediaRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        mediaRef.current.removeEventListener('play', handlePlay);
        mediaRef.current.removeEventListener('pause', handlePause);
        mediaRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        mediaRef.current.removeEventListener('ended', handleEnded);
      }
    };
  }, [mediaRef]);

  useEffect(() => {
    if (!mediaRef.current) {
      return;
    }
    if (mpIsPlaying) {
      playMediaWhenReady(mediaRef.current);
    } else {
      mediaRef.current.pause();
    }
  }, [mpIsPlaying]);

  useEffect(() => {
    if (!mediaRef.current) {
      return;
    }
    mediaRef.current.volume = mpVolume;
  }, [mpVolume]);

  useEffect(() => {
    if (!mediaRef.current) {
      return;
    }
    mediaRef.current.muted = mpIsMuted;
  }, [mpIsMuted]);

  useEffect(() => {
    if (!mediaRef.current) {
      return;
    }
    mediaRef.current.playbackRate = mpPlaybackSpeed;
  }, [mpPlaybackSpeed]);

  useEffect(() => {
    const playWhenReady = async () => {
      if (mpClip && mediaRef.current) {
        mediaRef.current.currentTime = Number(mpClip.start_time);
        if (mpShouldPlayRef.current) {
          const uri = await waitForSourceUri(mediaRef.current, 1000, 50);
          if (uri) {
            playMediaWhenReady(mediaRef.current, () => setMPShouldPlay(false));
          }
        }
        if (mpClip.end_time) {
          globalPauseAtTime = Number(mpClip.end_time);
        }
      }
      if (mpItemChapter && mediaRef.current) {
        if (mpItemChapterShouldSeek) {
          setMPItemChapterShouldSeek(false);
          mediaRef.current.currentTime = Number(mpItemChapter.start_time);
          if (mpShouldPlayRef.current) {
            const uri = await waitForSourceUri(mediaRef.current, 1000, 50);
            if (uri) {
              playMediaWhenReady(mediaRef.current, () => setMPShouldPlay(false));
            }
          }
        }
        if (mpItemChapter.end_time) {
          globalPauseAtTime = null;
        }
      }
      if (mpItemSoundbite && mediaRef.current) {
        mediaRef.current.currentTime = Number(mpItemSoundbite.start_time);
        if (mpShouldPlayRef.current) {
          const uri = await waitForSourceUri(mediaRef.current, 1000, 50);
          if (uri) {
            playMediaWhenReady(mediaRef.current, () => setMPShouldPlay(false));
          }
        }
        if (mpItemSoundbite.duration) {
          globalPauseAtTime = Number(mpItemSoundbite.start_time) + Number(mpItemSoundbite.duration);
        }
      }
    };

    playWhenReady();
  }, [mpClip, mpItemChapter, mpItemSoundbite]);

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

  if (mediaType === 'audio') {
    return (
      <audio
        ref={mediaRef}
        src={sourceUri}
        preload={preload}
        style={hidden ? { display: 'none' } : style}
      />
    );
  } else {
    return (
      <video
        ref={mediaRef}
        src={sourceUri}
        preload={preload}
        style={hidden ? { display: 'none' } : style}
        controls={false}
      />
    );
  }
};
