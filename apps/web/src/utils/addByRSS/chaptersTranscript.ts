import {
  getChaptersAndTranscriptUrls,
  mapAddByRSSChaptersToDTOItemChapters,
} from '@podverse/parser-mapping';
import type { AddByRSSChapterResponse } from '@podverse/helpers-requests';

/** Cached chapters/transcript API response keyed by itemIdText (in-memory; cleared on reload). */
export type CachedChaptersTranscriptEntry = {
  chapters: AddByRSSChapterResponse[];
  transcriptText?: string;
};

const chaptersTranscriptCache = new Map<string, CachedChaptersTranscriptEntry>();

export function getCachedChaptersTranscript(
  itemIdText: string
): CachedChaptersTranscriptEntry | undefined {
  return chaptersTranscriptCache.get(itemIdText);
}

export function setCachedChaptersTranscript(
  itemIdText: string,
  data: CachedChaptersTranscriptEntry
): void {
  chaptersTranscriptCache.set(itemIdText, data);
}

/** For future invalidation (e.g. when feed is re-parsed). */
export function clearChaptersTranscriptCacheForItem(itemIdText: string): void {
  chaptersTranscriptCache.delete(itemIdText);
}

export { getChaptersAndTranscriptUrls, mapAddByRSSChaptersToDTOItemChapters };
