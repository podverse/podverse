import { MediaPlayerControllerAV } from '../MediaPlayerControllerAV';
import { useMediaPlayer } from '../../../../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../../../../contexts/MediaPlayerCurrentTime';
import { useQueueResourcesUpdateNowPlaying } from '../../../../hooks/useQueueResourceUpdateNowPlaying';
import { useQueueResourcesMoveNowPlayingToHistory } from '../../../../hooks/useQueueResourceMoveNowPlayingToHistory';
import { useQueueResourcesLoadActive } from '../../../../hooks/useQueueResourcesLoadActive';
import { useQueueResourcesAbridgedIndex } from '../../../../contexts/QueueResourcesAbridgedIndex';
import { useAddByRSSPositionSave } from '../../../../hooks/useAddByRSSPositionSave';
import { useAddByRSSPlayNext } from '../../../../hooks/useAddByRSSPlayNext';

export function MediaPlayerControllerVideo() {
  const mediaPlayer = useMediaPlayer();
  const { mpCurrentTime, setMPCurrentTime } = useMediaPlayerCurrentTime();
  const updateNowPlaying = useQueueResourcesUpdateNowPlaying();
  const moveNowPlayingToHistory = useQueueResourcesMoveNowPlayingToHistory();
  const queueResourcesLoadActive = useQueueResourcesLoadActive();
  const { queueResourcesAbridgedIndex } = useQueueResourcesAbridgedIndex();
  const { savePosition: onAddByRSSPositionSave, handleEnded: onAddByRSSEnded } =
    useAddByRSSPositionSave();
  const onAddByRSSPlayNext = useAddByRSSPlayNext();

  const clearNowPlaying = () => {
    mediaPlayer.setMPAddByRSS(null);
    mediaPlayer.setMPChannel(null);
    mediaPlayer.setMPItem(null);
    mediaPlayer.setMPClip(null);
    mediaPlayer.setMPItemSoundbite(null);
    mediaPlayer.setMPItemChapter(null);
    mediaPlayer.setMPItemChapters(null);
    mediaPlayer.setMPItemChapterShouldSeek(false);
    mediaPlayer.setMPItemLabeledItemEnclosures([]);
    mediaPlayer.setMPEnclosureSelectedParams({
      type: 'default',
      enclosureRowSelected: null,
      sourceRowSelected: null,
    });
    mediaPlayer.setMPIsPlaying(false);
    mediaPlayer.setMPShouldPlay(false);
    mediaPlayer.setMPDuration(0);
    setMPCurrentTime(0);
  };

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
