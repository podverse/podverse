'use client';

import { useCallback } from 'react';

import type { DTOItemChapter } from '@podverse/helpers';

import { useMediaPlayer } from '../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../contexts/MediaPlayerCurrentTime';
import { getAdjacentChapter } from '../utils/itemChapter';
import { hasEpisodeChaptersForTrackNavigation } from '../utils/mediaPlayer/hasEpisodeChaptersForTrackNavigation';
import { selectItemChapterForTime } from '../utils/mediaPlayer/selectItemChapterForTime';

export function useEpisodeChapterNavigation(): {
  hasEpisodeChaptersForTrackButtons: boolean;
  seekToAdjacentChapter: (direction: 'previous' | 'next') => void;
} {
  const {
    mpClip,
    mpItemSoundbite,
    mpItemChapter,
    mpItemChapters,
    setMPItemChapter,
    setMPItemChapterShouldSeek,
  } = useMediaPlayer();
  const { mpCurrentTime } = useMediaPlayerCurrentTime();

  const hasEpisodeChaptersForTrackButtons = hasEpisodeChaptersForTrackNavigation({
    mpClip,
    mpItemSoundbite,
    mpItemChapters,
  });

  const seekToAdjacentChapter = useCallback(
    (direction: 'previous' | 'next') => {
      if (!mpItemChapters || mpItemChapters.length === 0) {
        return;
      }

      const currentChapter: DTOItemChapter | null =
        mpItemChapter ?? selectItemChapterForTime(mpItemChapters, mpCurrentTime);

      if (currentChapter === null) {
        return;
      }

      const adjacentChapter = getAdjacentChapter({
        currentChapter,
        chapters: mpItemChapters,
        direction,
      });

      if (adjacentChapter !== null) {
        setMPItemChapter(adjacentChapter);
        setMPItemChapterShouldSeek(true);
      }
    },
    [mpCurrentTime, mpItemChapter, mpItemChapters, setMPItemChapter, setMPItemChapterShouldSeek]
  );

  return {
    hasEpisodeChaptersForTrackButtons,
    seekToAdjacentChapter,
  };
}
