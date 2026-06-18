'use client';

import { useCallback } from 'react';

import { useAddByRSSListContext } from '../contexts/AddByRSSListContext';
import { useMediaPlayer } from '../contexts/MediaPlayer';
import { resolveAddByRSSListContextFromCurrentItem } from '../utils/addByRSS/resolveListContextFromCurrentItem';
import { useAddByRSSPlayNext } from './useAddByRSSPlayNext';
import { useEpisodeChapterNavigation } from './useEpisodeChapterNavigation';
import { useLongPress } from './useLongPress';
import { useQueueResourcesMoveNowPlayingToHistory } from './useQueueResourceMoveNowPlayingToHistory';
import { useQueueResourcesLoadActive } from './useQueueResourcesLoadActive';

export function useTrackNextButtonActions(): {
  hasEpisodeChaptersForTrackButtons: boolean;
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
    await moveNowPlayingToHistory({
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
    mpItem,
    mpItemSoundbite,
    setMPShouldPlay,
    mpIsPlaying,
    pendingMusicQueueLoadIntentRef,
    queueResourcesLoadActive,
  ]);

  const handleLongPress = useCallback(() => {
    void runNextTrack();
  }, [runNextTrack]);

  const handleClick = useCallback(async () => {
    if (hasEpisodeChaptersForTrackButtons) {
      seekToAdjacentChapter('next');
      return;
    }
    await runNextTrack();
  }, [hasEpisodeChaptersForTrackButtons, seekToAdjacentChapter, runNextTrack]);

  const { onClick, ...longPressProps } = useLongPress({
    onLongPress: handleLongPress,
    onClick: handleClick,
    delayMs: 500,
  });

  return {
    hasEpisodeChaptersForTrackButtons,
    onClick,
    longPressProps,
  };
}
