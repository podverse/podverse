'use client';

import { useEffect } from 'react';

import { useMediaPlayer } from '../contexts/MediaPlayer';
import { getApiRequestService } from '../factories/apiRequestService';

/**
 * Embed routes skip MediaPlayerController queue-head loading; fetch chapters here
 * so progress markers and title resolution match the main player.
 */
export function useEmbedItemChaptersLoad(): void {
  const { mpItem, setMPItemChapters } = useMediaPlayer();

  useEffect(() => {
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
  }, [mpItem?.id_text, setMPItemChapters]);
}
