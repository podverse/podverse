import { useCallback } from 'react';

import { useAddByRSSListContext } from '../../../../contexts/AddByRSSListContext';
import { useMediaPlayer } from '../../../../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../../../../contexts/MediaPlayerCurrentTime';
import { useQueueResourcesAbridgedIndex } from '../../../../contexts/QueueResourcesAbridgedIndex';
import { useAddByRSSPlayNext } from '../../../../hooks/useAddByRSSPlayNext';
import { useAddByRSSPositionSave } from '../../../../hooks/useAddByRSSPositionSave';
import { useMediaPlayerClearNowPlaying } from '../../../../hooks/useMediaPlayerClearNowPlaying';
import { useQueueResourcesMoveNowPlayingToHistory } from '../../../../hooks/useQueueResourceMoveNowPlayingToHistory';
import { useQueueResourcesLoadActive } from '../../../../hooks/useQueueResourcesLoadActive';
import { useQueueResourcesUpdateNowPlaying } from '../../../../hooks/useQueueResourceUpdateNowPlaying';
import { resolveAddByRSSListContextFromCurrentItem } from '../../../../utils/addByRSS/resolveListContextFromCurrentItem';
import { MediaPlayerControllerAV } from '../MediaPlayerControllerAV';

export function MediaPlayerControllerVideo() {
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

  return (
    <MediaPlayerControllerAV
      mediaType="video"
      preload="auto"
      style={{ width: '100%', height: '100%' }}
      mpAddByRSS={mediaPlayer.mpAddByRSS}
      mpChannel={mediaPlayer.mpChannel}
      mpClip={mediaPlayer.mpClip}
      setMPClip={mediaPlayer.setMPClip}
      mpItem={mediaPlayer.mpItem}
      mpItemLabeledEnclosures={mediaPlayer.mpItemLabeledItemEnclosures}
      mpEnclosureSelectedParams={mediaPlayer.mpEnclosureSelectedParams}
      mpItemChapter={mediaPlayer.mpItemChapter}
      setMPItemChapter={mediaPlayer.setMPItemChapter}
      mpItemChapters={mediaPlayer.mpItemChapters}
      mpItemChapterShouldSeek={mediaPlayer.mpItemChapterShouldSeek}
      setMPItemChapterShouldSeek={mediaPlayer.setMPItemChapterShouldSeek}
      mpItemSoundbite={mediaPlayer.mpItemSoundbite}
      setMPItemSoundbite={mediaPlayer.setMPItemSoundbite}
      mpIsPlaying={mediaPlayer.mpIsPlaying}
      setMPIsPlaying={mediaPlayer.setMPIsPlaying}
      mpPlaybackSpeed={mediaPlayer.mpPlaybackSpeed}
      mpVolume={mediaPlayer.mpVolume}
      mpIsMuted={mediaPlayer.mpIsMuted}
      mpShouldPlay={mediaPlayer.mpShouldPlay}
      setMPShouldPlay={mediaPlayer.setMPShouldPlay}
      setMPDuration={mediaPlayer.setMPDuration}
      mpCurrentTime={mpCurrentTime}
      setMPCurrentTime={setMPCurrentTime}
      addByRSSSeekToTime={mediaPlayer.addByRSSSeekToTime}
      setAddByRSSSeekToTime={mediaPlayer.setAddByRSSSeekToTime}
      pendingPlaybackDecision={mediaPlayer.pendingPlaybackDecision}
      setPendingPlaybackDecision={mediaPlayer.setPendingPlaybackDecision}
      updateNowPlaying={updateNowPlaying}
      moveNowPlayingToHistory={moveNowPlayingToHistory}
      queueResourcesLoadActive={queueResourcesLoadActive}
      queueResourcesAbridgedIndex={queueResourcesAbridgedIndex}
      onAddByRSSPositionSave={onAddByRSSPositionSave}
      onAddByRSSEnded={onAddByRSSEnded}
      onAddByRSSPlayNext={onAddByRSSPlayNext}
      clearNowPlaying={clearNowPlaying}
    />
  );
}
