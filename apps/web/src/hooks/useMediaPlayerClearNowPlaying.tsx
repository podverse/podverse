import { useCallback } from 'react';

import { useMediaPlayer } from '../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../contexts/MediaPlayerCurrentTime';

export function useMediaPlayerClearNowPlaying() {
  const mediaPlayer = useMediaPlayer();
  const { setMPCurrentTime } = useMediaPlayerCurrentTime();

  return useCallback(() => {
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
  }, [mediaPlayer, setMPCurrentTime]);
}
