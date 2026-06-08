'use client';

import { useEffect } from 'react';

import { useMediaPlayer } from '../contexts/MediaPlayer';
import { getApiRequestService } from '../factories/apiRequestService';
import { shouldEmbedShowChapterInfo } from '../lib/embed/shouldEmbedShowChapterInfo';

/**
 * Embed routes skip MediaPlayerController queue-head loading; fetch chapters here
 * so progress markers and title resolution match the main player.
 */
export function useEmbedItemChaptersLoad(): void {
  const { mpItem, mpClip, mpItemSoundbite, setMPItemChapter, setMPItemChapters } = useMediaPlayer();

  useEffect(() => {
    if (!shouldEmbedShowChapterInfo({ mpClip, mpItemSoundbite })) {
      setMPItemChapters(null);
      setMPItemChapter(null);
      return;
    }

    const itemIdText = mpItem?.id_text;

    if (itemIdText === undefined || itemIdText === '') {
      setMPItemChapters(null);
      return;
    }

    let cancelled = false;

    const fetchItemChapters = async () => {
      const response = await getApiRequestService().reqItemParseAndGetChapters(itemIdText);
      if (!cancelled) {
        setMPItemChapters(response.data);
      }
    };

    void fetchItemChapters();

    return () => {
      cancelled = true;
    };
  }, [mpClip, mpItem?.id_text, mpItemSoundbite, setMPItemChapter, setMPItemChapters]);
}
