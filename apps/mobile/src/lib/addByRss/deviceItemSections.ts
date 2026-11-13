import type { PIChapter } from '@podverse/parser-mapping';
import { buildAddByRSSChapterResponses } from '@podverse/parser-mapping';

import { safeJsonParse } from '../../data/db/serialization';
import type { AddByRssCredentials } from './credentials';
import { fetchAddByRssResourceOnDevice } from './deviceParse';
import type { AddByRssItemSections, AddByRssItemSectionUrls } from './itemSections';
import { toAddByRssItemSections } from './itemSections';

/**
 * The entries are read as the feed's host wrote them, the same trust the chapters-transcript
 * endpoint gives the file.
 */
const isChapterList = (value: unknown): value is PIChapter[] => Array.isArray(value);

const readChapters = (chaptersBody: string | null): PIChapter[] => {
  if (chaptersBody === null) {
    return [];
  }
  const parsed = safeJsonParse<unknown>(chaptersBody);
  if (typeof parsed !== 'object' || parsed === null || !('chapters' in parsed)) {
    return [];
  }
  return isChapterList(parsed.chapters) ? parsed.chapters : [];
};

/**
 * Sections for one Add by RSS item from the files its feed links, built the way the
 * chapters-transcript endpoint builds its answer, so the episode page and the player cannot tell
 * the two paths apart. A chapters body that is not JSON, or has no `chapters` array, gives no
 * chapters.
 */
export const itemSectionsFromDeviceBodies = (input: {
  itemIdText: string;
  chaptersBody: string | null;
  transcriptBody: string | null;
}): AddByRssItemSections =>
  toAddByRssItemSections({
    chapters: buildAddByRSSChapterResponses(input.itemIdText, readChapters(input.chaptersBody)),
    transcriptText: input.transcriptBody ?? undefined,
  });

const fetchSectionBody = async (input: {
  credentials: AddByRssCredentials | null;
  feedUrl: string;
  resource: 'chapters' | 'transcript';
  signal?: AbortSignal;
  url: string | undefined;
}): Promise<string | null> => {
  if (input.url === undefined) {
    return null;
  }
  const { body, status } = await fetchAddByRssResourceOnDevice({
    credentials: input.credentials,
    feedUrl: input.feedUrl,
    signal: input.signal,
    url: input.url,
  });
  if (status < 200 || status >= 300) {
    throw new Error(`The Add by RSS ${input.resource} file answered HTTP ${status}`);
  }
  return body;
};

/**
 * Fetches an Add by RSS item's chapters and transcript on this device, one after the other, each
 * only when the item links it. Throws when either file answers outside 2xx or cannot be fetched,
 * as the chapters-transcript endpoint fails when either file does.
 */
export const fetchAddByRssItemSectionsOnDevice = async (input: {
  credentials: AddByRssCredentials | null;
  feedUrl: string;
  itemIdText: string;
  signal?: AbortSignal;
  urls: AddByRssItemSectionUrls;
}): Promise<AddByRssItemSections> => {
  const shared = { credentials: input.credentials, feedUrl: input.feedUrl, signal: input.signal };
  const chaptersBody = await fetchSectionBody({
    ...shared,
    resource: 'chapters',
    url: input.urls.chaptersFeedUrl,
  });
  const transcriptBody = await fetchSectionBody({
    ...shared,
    resource: 'transcript',
    url: input.urls.transcriptUrl,
  });
  return itemSectionsFromDeviceBodies({
    chaptersBody,
    itemIdText: input.itemIdText,
    transcriptBody,
  });
};
