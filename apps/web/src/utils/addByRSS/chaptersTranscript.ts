import type { DTOItemChapter } from '@podverse/helpers';
import type { AddByRSSChapterResponse } from '@podverse/helpers-requests';
import type { AddByRSSMappedFeed } from './types.js';

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

/**
 * Get chapters feed URL and first transcript URL from add-by-RSS item bundle.
 */
export function getChaptersAndTranscriptUrls(bundle: AddByRSSMappedFeed['items'][number]): {
  chaptersFeedUrl: string | undefined;
  transcriptUrl: string | undefined;
} {
  const chaptersFeedUrl =
    bundle.chaptersFeed?.url && bundle.chaptersFeed.url.trim() !== ''
      ? bundle.chaptersFeed.url
      : undefined;
  const firstTranscript = bundle.transcripts?.[0];
  const transcriptUrl =
    firstTranscript?.url &&
    typeof firstTranscript.url === 'string' &&
    firstTranscript.url.trim() !== ''
      ? firstTranscript.url
      : undefined;
  return { chaptersFeedUrl, transcriptUrl };
}

/**
 * Map API chapters response to DTOItemChapter-like array with synthetic id for list keys.
 */
export function mapAddByRSSChaptersToDTOItemChapters(
  chapters: AddByRSSChapterResponse[]
): DTOItemChapter[] {
  return chapters.map((ch, index) => ({
    id: index,
    id_text: ch.id_text,
    item_chapters_feed_id: 0,
    data_hash: ch.data_hash,
    start_time: ch.start_time,
    end_time: ch.end_time ?? null,
    title: ch.title ?? null,
    img: ch.img ?? null,
    web_url: ch.web_url ?? null,
    table_of_contents: ch.table_of_contents,
    item_chapters_feed: null,
  }));
}
