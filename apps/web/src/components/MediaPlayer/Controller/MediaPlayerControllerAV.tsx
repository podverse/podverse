'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import type {
  QueueResourcesAbridgedIndex,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
  LabeledItemEnclosure,
  EnclosureSelectedParams,
  DTOChannel,
  SelectedLabeledItemEnclosureAndSource,
} from '@podverse/helpers';
import type { MediaPlayerAddByRSSState } from '../../../contexts/MediaPlayer';
import { getSelectedLabeledItemEnclosureAndSource, isEqual, MediumEnum } from '@podverse/helpers';
import { EVENTS } from '../../../constants/events';
import type { MoveNowPlayingToHistoryCallbackParams } from '../../../hooks/useQueueResourceMoveNowPlayingToHistory';
import type { UpdateNowPlayingParams } from '../../../hooks/useQueueResourceUpdateNowPlaying';
import {
  checkIfIsAudioFile,
  checkIfIsVideoFile,
  checkIsLiveItem,
} from '../../../utils/mediaPlayer/mediaPlayerItemEnclosureType';
import { playMediaWhenReady } from '../../../utils/mediaPlayer/mediaPlayerPlayMediaWhenReady';
import { waitForSourceUri } from '../../../utils/mediaPlayer/mediaPlayerPlayMediaWhenReady';

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
  updateNowPlaying: (args: UpdateNowPlayingParams) => void;
  moveNowPlayingToHistory: (params: MoveNowPlayingToHistoryCallbackParams) => Promise<void>;
  queueResourcesLoadActive: () => Promise<number>;
  queueResourcesAbridgedIndex: QueueResourcesAbridgedIndex;
  /** When add-by-RSS is now playing, called to save position (e.g. every 15s and on pause). */
  onAddByRSSPositionSave?: (positionSeconds: number) => void;
  /** When add-by-RSS playback ends, called to add to history; then controller clears add-by-RSS state. */
  onAddByRSSEnded?: (positionSeconds: number) => Promise<void>;
  /** When add-by-RSS playback ends and queue is empty, try to play next from list context. */
  onAddByRSSPlayNext?: () => Promise<void>;
  setMPAddByRSS: (val: MediaPlayerAddByRSSState) => void;
}

let globalPauseAtTime: number | null = null;

export const MediaPlayerControllerAV: React.FC<MediaPlayerControllerAVProps> = (props) => {
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
    mpCurrentTime,
    setMPCurrentTime,
    updateNowPlaying,
    moveNowPlayingToHistory,
    queueResourcesLoadActive,
    queueResourcesAbridgedIndex,
    onAddByRSSPositionSave,
    onAddByRSSEnded,
    onAddByRSSPlayNext,
    setMPAddByRSS,
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

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || !mpAddByRSS?.resourceData) return;

    const mediumId = mpAddByRSS.resourceData.medium_id;
    if (mediaType === 'audio' && mediumId === MediumEnum.Video) return;
    if (mediaType === 'video' && mediumId !== MediumEnum.Video) return;

    const enclosureUrl = mpAddByRSS.resourceData.enclosure_url;
    if (typeof enclosureUrl === 'string' && enclosureUrl.trim() !== '') {
      const seekTime = typeof mpCurrentTime === 'number' && mpCurrentTime >= 0 ? mpCurrentTime : 0;
      media.currentTime = seekTime;
      media.src = enclosureUrl;
      media.load();
      if (mpShouldPlayRef.current) {
        playMediaWhenReady(media, () => setMPShouldPlay(false));
      }
    }
  }, [mpAddByRSS, mediaType]);

  useEffect(() => {
    if (mpAddByRSS) return;
    if (!selectedItemEnclosureAndSource) {
      return;
    }
    if (!selectedItemEnclosureAndSource.labeledItemEnclosure?.enclosure?.type) {
      return;
    }
    if (!selectedItemEnclosureAndSource.source?.uri) {
      return;
    }

    const media = mediaRef.current;
    const mpItem = mpItemRef.current;
    const mpShouldPlay = mpShouldPlayRef.current;

    if (media) {
      const isAudioFile = checkIfIsAudioFile(selectedItemEnclosureAndSource);
      const isVideoFile = checkIfIsVideoFile(selectedItemEnclosureAndSource);
      const isLiveItem = checkIsLiveItem(mpItem);

      if ((mediaType === 'audio' ? isAudioFile : isVideoFile) && !isLiveItem) {
        media.currentTime = 0;
        media.load();
        if (mpShouldPlay) {
          playMediaWhenReady(media, () => setMPShouldPlay(false));
        }
      } else {
        media.pause();
        media.removeAttribute('src');
        media.load();
      }
    }
  }, [mpAddByRSS, selectedItemEnclosureAndSource]);

  useEffect(() => {
    const handleSeek = (e: Event) => {
      const customEvent = e as CustomEvent<{ time: number }>;
      const media = mediaRef.current;
      if (media && typeof customEvent.detail.time === 'number') {
        media.currentTime = customEvent.detail.time;
      }
    };

    const handleJumpBack = (e: Event) => {
      const customEvent = e as CustomEvent<{ seconds: number }>;
      const media = mediaRef.current;
      if (media && typeof customEvent.detail.seconds === 'number') {
        media.currentTime = Math.max(media.currentTime - customEvent.detail.seconds, 0);
      }
    };

    const handleJumpForward = (e: Event) => {
      const customEvent = e as CustomEvent<{ seconds: number }>;
      const media = mediaRef.current;
      if (
        media &&
        typeof customEvent.detail.seconds === 'number' &&
        typeof media.duration === 'number'
      ) {
        media.currentTime = Math.min(
          media.currentTime + customEvent.detail.seconds,
          media.duration
        );
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
  }, []);

  useEffect(() => {
    const media = mediaRef?.current;
    if (!media) {
      return;
    }

    const handleLoadedMetadata = () => {
      const newDuration = media.duration;
      const channel = mpChannelRef.current;
      const clip = mpClipRef.current;
      const itemSoundbite = mpItemSoundbiteRef.current;
      const item = mpItemRef.current;
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
          if (Number(queueResourceAbridged?.p) > 0) {
            newCurrentTime = Number(queueResourceAbridged?.p);
          } else {
            newCurrentTime = 0;
          }
        }
      }

      if ((clip || itemSoundbite || item) && newCurrentTime !== null) {
        media.currentTime = newCurrentTime;
      }

      setMPDuration(newDuration);
      updateNowPlaying({
        mpChannel: channel,
        mpClip: clip,
        mpItem: item,
        mpItemSoundbite: itemSoundbite,
        mpDuration: newDuration,
        mpCurrentTime: newCurrentTime !== null ? newCurrentTime : 0,
      });
    };

    const handlePlay = () => {
      const newCurrentTime = media.currentTime;
      if (newCurrentTime < media.duration) {
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
    };

    const handlePause = () => {
      const newCurrentTime = media.currentTime;
      if (mpAddByRSSRef.current && onAddByRSSPositionSaveRef.current) {
        onAddByRSSPositionSaveRef.current(newCurrentTime);
      }
      if (newCurrentTime < media.duration) {
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
    };

    const handleTimeUpdate = () => {
      const channel = mpChannelRef.current;
      const clip = mpClipRef.current;
      const item = mpItemRef.current;
      const itemSoundbite = mpItemSoundbiteRef.current;
      const chapters = mpItemChaptersRef.current;
      const newCurrentTime = media.currentTime;

      setMPCurrentTime(newCurrentTime);

      if (lastPlaybackTimeRef.current !== null) {
        const delta = newCurrentTime - lastPlaybackTimeRef.current;
        if (delta > 0) {
          playbackElapsedRef.current += delta;
        }
      }
      lastPlaybackTimeRef.current = newCurrentTime;

      if (playbackElapsedRef.current >= 15) {
        if (mpAddByRSSRef.current && onAddByRSSPositionSaveRef.current) {
          onAddByRSSPositionSaveRef.current(newCurrentTime);
        }
        updateNowPlaying({
          mpChannel: channel,
          mpClip: clip,
          mpItem: item,
          mpItemSoundbite: itemSoundbite,
          mpCurrentTime: newCurrentTime,
        });
        playbackElapsedRef.current = 0;
      }

      if (globalPauseAtTime !== null && newCurrentTime >= globalPauseAtTime) {
        setMPIsPlaying(false);
        globalPauseAtTime = null;
      }

      if (clip && clip.end_time) {
        const endTimeNum =
          typeof clip.end_time === 'string' ? parseFloat(clip.end_time) : clip.end_time;
        const endTimeNumAdjusted = endTimeNum + 1;
        if (!isNaN(endTimeNumAdjusted) && newCurrentTime >= endTimeNumAdjusted) {
          setMPClip(null);
          setMPIsPlaying(false);
          globalPauseAtTime = null;
        }
      }

      if (itemSoundbite && itemSoundbite.duration) {
        const startNum =
          typeof itemSoundbite.start_time === 'string'
            ? parseFloat(itemSoundbite.start_time)
            : itemSoundbite.start_time;
        const durationNum =
          typeof itemSoundbite.duration === 'string'
            ? parseFloat(itemSoundbite.duration)
            : itemSoundbite.duration;
        const endTimeNum = startNum + durationNum;
        const endTimeNumAdjusted = endTimeNum + 1;
        if (!isNaN(endTimeNumAdjusted) && newCurrentTime >= endTimeNumAdjusted) {
          setMPItemSoundbite(null);
          setMPIsPlaying(false);
          globalPauseAtTime = null;
        }
      }

      if (!itemSoundbite && !clip && Array.isArray(chapters) && chapters.length > 0) {
        const matchingChapters = chapters.filter((ch) => {
          const start =
            typeof ch.start_time === 'string' ? parseFloat(ch.start_time) : ch.start_time;
          const end = typeof ch.end_time === 'string' ? parseFloat(ch.end_time) : ch.end_time;
          if (typeof end !== 'number' || isNaN(end)) {
            return false;
          }
          return newCurrentTime >= start && newCurrentTime < end;
        });
        let selectedChapter = null;
        if (matchingChapters.length > 0) {
          selectedChapter =
            matchingChapters.find((ch) => ch.table_of_contents === false) || matchingChapters[0];
        }
        if (
          selectedChapter &&
          (!mpItemChapterRef.current || mpItemChapterRef.current.id !== selectedChapter.id)
        ) {
          setMPItemChapter(selectedChapter);
        }
      }
    };

    const handleEnded = async () => {
      const onAddByRSSEndedFn = onAddByRSSEndedRef.current;
      const onAddByRSSPlayNextFn = onAddByRSSPlayNextRef.current;
      if (mpAddByRSSRef.current && onAddByRSSEndedFn) {
        const positionSeconds = media.currentTime;
        await onAddByRSSEndedFn(positionSeconds);
        setMPAddByRSS(null);
        setMPShouldPlay(false);
        const upcomingCount = await queueResourcesLoadActive();
        if (upcomingCount === 0 && onAddByRSSPlayNextFn) {
          await onAddByRSSPlayNextFn();
        }
        return;
      }
      await moveNowPlayingToHistory({
        completed: true,
        mpClip: mpClipRef.current,
        mpItem: mpItemRef.current,
        mpItemSoundbite: mpItemSoundbiteRef.current,
      });
      setMPShouldPlay(true);
      await queueResourcesLoadActive();
    };

    media.addEventListener('loadedmetadata', handleLoadedMetadata);
    media.addEventListener('play', handlePlay);
    media.addEventListener('pause', handlePause);
    media.addEventListener('timeupdate', handleTimeUpdate);
    media.addEventListener('ended', handleEnded);

    return () => {
      media.removeEventListener('loadedmetadata', handleLoadedMetadata);
      media.removeEventListener('play', handlePlay);
      media.removeEventListener('pause', handlePause);
      media.removeEventListener('timeupdate', handleTimeUpdate);
      media.removeEventListener('ended', handleEnded);
    };
  }, [mediaRef]);

  useEffect(() => {
    const media = mediaRef?.current;
    if (!media) {
      return;
    }
    if (mpIsPlaying) {
      playMediaWhenReady(media);
    } else {
      media.pause();
    }
  }, [mpIsPlaying]);

  useEffect(() => {
    const media = mediaRef?.current;
    if (!media) {
      return;
    }
    media.volume = mpVolume;
  }, [mpVolume]);

  useEffect(() => {
    const media = mediaRef?.current;
    if (!media) {
      return;
    }
    media.muted = mpIsMuted;
  }, [mpIsMuted]);

  useEffect(() => {
    const media = mediaRef?.current;
    if (!media) {
      return;
    }
    media.playbackRate = mpPlaybackSpeed;
  }, [mpPlaybackSpeed]);

  useEffect(() => {
    const mpShouldPlay = mpShouldPlayRef.current;
    const media = mediaRef.current;
    const playWhenReady = async () => {
      if (mpClip && media) {
        media.currentTime = Number(mpClip.start_time);
        if (mpShouldPlay) {
          const uri = await waitForSourceUri(media, 1000, 50);
          if (uri) {
            playMediaWhenReady(media, () => setMPShouldPlay(false));
          }
        }
        if (mpClip.end_time) {
          globalPauseAtTime = Number(mpClip.end_time);
        }
      }
      if (mpItemChapter && media) {
        if (mpItemChapterShouldSeek) {
          setMPItemChapterShouldSeek(false);
          media.currentTime = Number(mpItemChapter.start_time);
          if (mpShouldPlay) {
            const uri = await waitForSourceUri(media, 1000, 50);
            if (uri) {
              playMediaWhenReady(media, () => setMPShouldPlay(false));
            }
          }
        }
        if (mpItemChapter.end_time) {
          globalPauseAtTime = null;
        }
      }
      if (mpItemSoundbite && media) {
        media.currentTime = Number(mpItemSoundbite.start_time);
        if (mpShouldPlay) {
          const uri = await waitForSourceUri(media, 1000, 50);
          if (uri) {
            playMediaWhenReady(media, () => setMPShouldPlay(false));
          }
        }
        if (mpItemSoundbite.duration) {
          globalPauseAtTime = Number(mpItemSoundbite.start_time) + Number(mpItemSoundbite.duration);
        }
      }
    };

    playWhenReady();
  }, [mpClip, mpItemChapter, mpItemSoundbite]);

  const sourceUri = selectedItemEnclosureAndSource?.source?.uri ?? undefined;

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
