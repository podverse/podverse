import { useEffect, useMemo, useSyncExternalStore } from 'react';

import type { DTOItemChapter } from '@podverse/helpers/dto';
import type { PlaybackTarget } from '@podverse/playback-core';
import { selectItemChapterForTime } from '@podverse/playback-core/selectItemChapterForTime';

import { useAuth } from '../auth/AuthProvider';
import type { MobileAuthRequestContext } from '../data';
import { segmentsRepository } from '../data';
import { usePlaybackProgress, usePlaybackSession } from './PlaybackProvider';
import { usePlaybackScrubPreview } from './playbackScrubPreviewStore';

const itemFromTarget = (target: PlaybackTarget | null) => {
  if (target === null) {
    return null;
  }
  switch (target.kind) {
    case 'clip':
    case 'soundbite':
    case 'chapter':
    case 'item-podcast':
    case 'item-video':
    case 'item-music':
    case 'livestream':
      return target.item;
    case 'add-by-rss':
      return null;
  }
};

type ChaptersCache = {
  chapters: DTOItemChapter[];
  itemIdText: string | null;
};

let chaptersCache: ChaptersCache = { chapters: [], itemIdText: null };
const chaptersListeners = new Set<() => void>();
let inFlight: { itemIdText: string; promise: Promise<DTOItemChapter[]> } | null = null;

const emitChapters = (): void => {
  chaptersListeners.forEach((listener) => {
    listener();
  });
};

const getChaptersSnapshot = (): ChaptersCache => chaptersCache;

const subscribeChapters = (listener: () => void): (() => void) => {
  chaptersListeners.add(listener);
  return () => {
    chaptersListeners.delete(listener);
  };
};

const setChaptersCache = (itemIdText: string | null, chapters: DTOItemChapter[]): void => {
  if (
    chaptersCache.itemIdText === itemIdText &&
    chaptersCache.chapters.length === chapters.length &&
    chaptersCache.chapters.every((chapter, index) => chapter.id_text === chapters[index]?.id_text)
  ) {
    return;
  }
  chaptersCache = { chapters, itemIdText };
  emitChapters();
};

const loadChapters = async (
  context: MobileAuthRequestContext,
  itemIdText: string
): Promise<DTOItemChapter[]> => {
  if (chaptersCache.itemIdText === itemIdText) {
    return chaptersCache.chapters;
  }
  if (inFlight !== null && inFlight.itemIdText === itemIdText) {
    return inFlight.promise;
  }

  const promise = (async (): Promise<DTOItemChapter[]> => {
    try {
      const rows = await segmentsRepository.getChaptersByItemIdText(context, itemIdText);
      setChaptersCache(itemIdText, rows);
      return rows;
    } catch {
      setChaptersCache(itemIdText, []);
      return [];
    } finally {
      if (inFlight !== null && inFlight.itemIdText === itemIdText) {
        inFlight = null;
      }
    }
  })();

  inFlight = { itemIdText, promise };
  return promise;
};

/**
 * Imperative chapter load for transport (prev/next). Shares the process-wide cache with the UI hook.
 */
export const resolveNowPlayingChapters = async (
  context: MobileAuthRequestContext,
  itemIdText: string
): Promise<DTOItemChapter[]> => {
  return loadChapters(context, itemIdText);
};

/**
 * Fetch chapters once per now-playing episode (process-wide cache). Does not subscribe to the
 * playhead — pair with {@link useActiveNowPlayingChapter} in leaf chrome.
 */
export function useNowPlayingChapters(): { chapters: DTOItemChapter[] } {
  const { accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const { activeTarget } = usePlaybackSession();
  const cache = useSyncExternalStore(subscribeChapters, getChaptersSnapshot, getChaptersSnapshot);

  const item = itemFromTarget(activeTarget);
  const chaptersItemIdText = item !== null ? item.id_text : null;

  useEffect(() => {
    if (chaptersItemIdText === null) {
      setChaptersCache(null, []);
      return;
    }
    if (cache.itemIdText === chaptersItemIdText) {
      return;
    }
    void loadChapters({ accessToken, clearSession, refreshToken, setTokens }, chaptersItemIdText);
  }, [accessToken, cache.itemIdText, chaptersItemIdText, clearSession, refreshToken, setTokens]);

  return {
    chapters: cache.itemIdText === chaptersItemIdText ? cache.chapters : [],
  };
}

/**
 * Active chapter for the current playhead. Mount only in leaf chrome so the full-player shell stays
 * off the progress render path.
 */
export function useActiveNowPlayingChapter(chapters: DTOItemChapter[]): DTOItemChapter | null {
  const { activeTarget } = usePlaybackSession();
  const { positionSeconds } = usePlaybackProgress();
  const previewPositionSeconds = usePlaybackScrubPreview();
  const lookupSeconds = previewPositionSeconds ?? positionSeconds;

  return useMemo(() => {
    if (activeTarget?.kind === 'chapter' && previewPositionSeconds === null) {
      return activeTarget.chapter;
    }
    if (
      activeTarget === null ||
      activeTarget.kind === 'clip' ||
      activeTarget.kind === 'soundbite' ||
      activeTarget.kind === 'add-by-rss' ||
      activeTarget.kind === 'livestream'
    ) {
      return null;
    }
    return selectItemChapterForTime(chapters, lookupSeconds);
  }, [activeTarget, chapters, lookupSeconds, previewPositionSeconds]);
}
