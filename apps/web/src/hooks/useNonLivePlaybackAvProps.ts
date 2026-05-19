'use client';

import { useCallback } from 'react';

import type { NonLiveMediaOrchestratorProps } from '../components/MediaPlayer/Controller/NonLiveMediaOrchestrator';
import { useAddByRSSListContext } from '../contexts/AddByRSSListContext';
import { useMediaPlayer } from '../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../contexts/MediaPlayerCurrentTime';
import { useQueueResourcesAbridgedIndex } from '../contexts/QueueResourcesAbridgedIndex';
import { resolveAddByRSSListContextFromCurrentItem } from '../utils/addByRSS/resolveListContextFromCurrentItem';
import { useAddByRSSPlayNext } from './useAddByRSSPlayNext';
import { useAddByRSSPositionSave } from './useAddByRSSPositionSave';
import { useMediaPlayerClearNowPlaying } from './useMediaPlayerClearNowPlaying';
import { useQueueResourcesMoveNowPlayingToHistory } from './useQueueResourceMoveNowPlayingToHistory';
import { useQueueResourcesLoadActive } from './useQueueResourcesLoadActive';
import { useQueueResourcesUpdateNowPlaying } from './useQueueResourceUpdateNowPlaying';

/**
 * Shared props builder for the two non-live `NonLiveMediaOrchestrator` mounts
 * (hidden audio + floating video shell).
 */
export function useNonLivePlaybackAvProps(): Omit<
  NonLiveMediaOrchestratorProps,
  'mediaType' | 'preload' | 'style' | 'hidden'
> {
  const mediaPlayer = useMediaPlayer();
  const { listContext } = useAddByRSSListContext();
  const { mpCurrentTime, setMPCurrentTime } = useMediaPlayerCurrentTime();
  const clearNowPlaying = useMediaPlayerClearNowPlaying();
  const updateNowPlaying = useQueueResourcesUpdateNowPlaying();
  const moveNowPlayingToHistory = useQueueResourcesMoveNowPlayingToHistory();
  const queueResourcesLoadActive = useQueueResourcesLoadActive();
  const { queueResourcesAbridgedIndex } = useQueueResourcesAbridgedIndex();
  const { savePosition: onAddByRSSPositionSave, handleEnded: onAddByRSSEnded } =
    useAddByRSSPositionSave();
  const playNextRaw = useAddByRSSPlayNext();
  const onAddByRSSPlayNext = useCallback(async (): Promise<boolean> => {
    const hasListContext = listContext && listContext.itemIdTexts.length > 0;
    if (!hasListContext && mediaPlayer.mpAddByRSS) {
      const fallbackContext = await resolveAddByRSSListContextFromCurrentItem(
        mediaPlayer.mpAddByRSS.idText,
        mediaPlayer.mpAddByRSS.resourceData,
        'recent'
      );
      return playNextRaw(fallbackContext ?? undefined);
    }
    return playNextRaw();
  }, [listContext, mediaPlayer.mpAddByRSS, playNextRaw]);

  return {
    mpAddByRSS: mediaPlayer.mpAddByRSS,
    mpChannel: mediaPlayer.mpChannel,
    mpClip: mediaPlayer.mpClip,
    setMPClip: mediaPlayer.setMPClip,
    mpItem: mediaPlayer.mpItem,
    mpItemLabeledEnclosures: mediaPlayer.mpItemLabeledItemEnclosures,
    mpEnclosureSelectedParams: mediaPlayer.mpEnclosureSelectedParams,
    mpItemChapter: mediaPlayer.mpItemChapter,
    setMPItemChapter: mediaPlayer.setMPItemChapter,
    mpItemChapters: mediaPlayer.mpItemChapters,
    mpItemChapterShouldSeek: mediaPlayer.mpItemChapterShouldSeek,
    setMPItemChapterShouldSeek: mediaPlayer.setMPItemChapterShouldSeek,
    mpItemSoundbite: mediaPlayer.mpItemSoundbite,
    setMPItemSoundbite: mediaPlayer.setMPItemSoundbite,
    mpIsPlaying: mediaPlayer.mpIsPlaying,
    setMPIsPlaying: mediaPlayer.setMPIsPlaying,
    mpPlaybackSpeed: mediaPlayer.mpPlaybackSpeed,
    mpVolume: mediaPlayer.mpVolume,
    mpIsMuted: mediaPlayer.mpIsMuted,
    mpShouldPlay: mediaPlayer.mpShouldPlay,
    setMPShouldPlay: mediaPlayer.setMPShouldPlay,
    setMPDuration: mediaPlayer.setMPDuration,
    mpCurrentTime,
    setMPCurrentTime,
    addByRSSSeekToTime: mediaPlayer.addByRSSSeekToTime,
    setAddByRSSSeekToTime: mediaPlayer.setAddByRSSSeekToTime,
    pendingPlaybackDecision: mediaPlayer.pendingPlaybackDecision,
    setPendingPlaybackDecision: mediaPlayer.setPendingPlaybackDecision,
    updateNowPlaying,
    moveNowPlayingToHistory,
    queueResourcesLoadActive,
    queueResourcesAbridgedIndex,
    onAddByRSSPositionSave,
    onAddByRSSEnded,
    onAddByRSSPlayNext,
    clearNowPlaying,
  };
}
