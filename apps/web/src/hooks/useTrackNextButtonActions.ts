'use client';

import { useCallback } from 'react';

import { useAddByRSSListContext } from '../contexts/AddByRSSListContext';
import { useMediaPlayer } from '../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../contexts/MediaPlayerCurrentTime';
import { crossDevicePlaybackStore } from '../lib/crossDevicePlayback/crossDevicePlaybackStore';
import { sendPlaybackCommand } from '../lib/crossDevicePlayback/sendPlaybackCommand';
import { tryOptimisticQueueNext } from '../lib/queue/optimisticQueueLeave';
import { resolveAddByRSSListContextFromCurrentItem } from '../utils/addByRSS/resolveListContextFromCurrentItem';
import { useAddByRSSPlayNext } from './useAddByRSSPlayNext';
import { useEpisodeChapterNavigation } from './useEpisodeChapterNavigation';
import { useLongPress } from './useLongPress';
import { useOptimisticQueueLeave } from './useOptimisticQueueLeave';
import { useQueueResourcesMoveNowPlayingToHistory } from './useQueueResourceMoveNowPlayingToHistory';
import { useQueueResourcesLoadActive } from './useQueueResourcesLoadActive';

export function useTrackNextButtonActions(): {
  hasEpisodeChaptersForTrackButtons: boolean;
  /** What a click on the button runs. Cross-device `next` / `previous` commands call this. */
  runLocalClick: () => Promise<void>;
  onClick: () => void;
  longPressProps: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerUp: () => void;
    onPointerLeave: () => void;
    onPointerCancel: () => void;
  };
} {
  const {
    mpItem,
    mpClip,
    mpItemSoundbite,
    pendingMusicQueueLoadIntentRef,
    setMPShouldPlay,
    mpIsPlaying,
    mpAddByRSS,
  } = useMediaPlayer();
  const { mpCurrentTime } = useMediaPlayerCurrentTime();
  useOptimisticQueueLeave();
  const { listContext } = useAddByRSSListContext();
  const moveNowPlayingToHistory = useQueueResourcesMoveNowPlayingToHistory();
  const queueResourcesLoadActive = useQueueResourcesLoadActive();
  const addByRSSPlayNext = useAddByRSSPlayNext();
  const { hasEpisodeChaptersForTrackButtons, seekToAdjacentChapter } =
    useEpisodeChapterNavigation();

  const runNextTrack = useCallback(async () => {
    if (mpAddByRSS) {
      const hasListContext = listContext && listContext.itemIdTexts.length > 0;
      const fallbackContext = !hasListContext
        ? await resolveAddByRSSListContextFromCurrentItem(
            mpAddByRSS.idText,
            mpAddByRSS.resourceData,
            'recent'
          )
        : null;
      await addByRSSPlayNext(fallbackContext ?? undefined);
      return;
    }
    const playingId = mpClip?.id_text ?? mpItemSoundbite?.id_text ?? mpItem?.id_text ?? null;
    if (playingId !== null) {
      const outcome = tryOptimisticQueueNext({
        completed: false,
        playbackPosition: String(mpCurrentTime),
        playingId,
        shouldPlay: mpIsPlaying,
      });
      if (outcome === 'started' || outcome === 'settled') {
        if (outcome === 'started') {
          setMPShouldPlay(mpIsPlaying);
          pendingMusicQueueLoadIntentRef.current = 'fresh_transition';
        }
        return;
      }
    }
    await moveNowPlayingToHistory({
      completed: false,
      mpClip: mpClip,
      mpItem: mpItem,
      mpItemSoundbite: mpItemSoundbite,
    });
    setMPShouldPlay(mpIsPlaying);
    pendingMusicQueueLoadIntentRef.current = 'fresh_transition';
    await queueResourcesLoadActive();
  }, [
    mpAddByRSS,
    listContext,
    addByRSSPlayNext,
    moveNowPlayingToHistory,
    mpClip,
    mpCurrentTime,
    mpItem,
    mpItemSoundbite,
    setMPShouldPlay,
    mpIsPlaying,
    pendingMusicQueueLoadIntentRef,
    queueResourcesLoadActive,
  ]);

  const handleLongPress = useCallback(() => {
    if (crossDevicePlaybackStore.getSnapshot().role === 'remote') {
      void sendPlaybackCommand({ type: 'next' });
      return;
    }
    void runNextTrack();
  }, [runNextTrack]);

  const runLocalClick = useCallback(async () => {
    if (hasEpisodeChaptersForTrackButtons) {
      seekToAdjacentChapter('next');
      return;
    }
    await runNextTrack();
  }, [hasEpisodeChaptersForTrackButtons, seekToAdjacentChapter, runNextTrack]);

  const handleClick = useCallback(async () => {
    if (crossDevicePlaybackStore.getSnapshot().role === 'remote') {
      await sendPlaybackCommand({ type: 'next' });
      return;
    }
    await runLocalClick();
  }, [runLocalClick]);

  const { onClick, ...longPressProps } = useLongPress({
    onLongPress: handleLongPress,
    onClick: handleClick,
    delayMs: 500,
  });

  return {
    hasEpisodeChaptersForTrackButtons,
    runLocalClick,
    onClick,
    longPressProps,
  };
}
