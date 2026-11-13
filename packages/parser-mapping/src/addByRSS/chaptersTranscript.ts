import type { DTOItemChapter, DTOItemChapterCreate } from '@podverse/helpers';

import { assignChapterEndTimes, compatParsedChapters } from '../compat/chapters/chapters.js';
import type { PIChapter } from '../types/partytime.js';
import type { AddByRSSMappedFeed } from './types.js';

/**
 * Minimal chapter shape from add-by-RSS chapters API (compatible with AddByRSSChapterResponse).
 * Allows mapping to DTOItemChapter without depending on helpers-requests.
 */
export type AddByRSSChapterLike = {
  id_text: string;
  data_hash: string;
  start_time: string;
  end_time: string | null;
  title: string | null;
  img: string | null;
  web_url: string | null;
  table_of_contents: boolean;
};

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
  chapters: AddByRSSChapterLike[]
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

/** A chapter row as the chapters-transcript endpoint returns it and the device builds it. */
export type AddByRSSChapterWithIdText = DTOItemChapterCreate & { id_text: string };

/**
 * Chapter rows for one Add by RSS item from the `chapters` array of its chapters JSON: end times
 * filled from the next table-of-contents chapter, then ids `<itemIdText>-ch-<index>`.
 */
export const buildAddByRSSChapterResponses = (
  itemIdText: string,
  chapters: PIChapter[]
): AddByRSSChapterWithIdText[] =>
  assignChapterEndTimes(compatParsedChapters(chapters)).map((chapter, index) => ({
    ...chapter,
    id_text: `${itemIdText}-ch-${index}`,
  }));
