import type { DTOItemChapterCreate } from '@podverse/helpers';
import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { isValidHttpUrl } from '@podverse/helpers-validation';

import type { PIChapter } from '../../types/partytime.js';
import { getPIChapterMd5Hash } from './hash.js';

function mapChapterLocation(location: PIChapter['location']): DTOItemChapterCreate['location'] {
  if (!location || typeof location !== 'object') {
    return null;
  }
  const hasGeo = typeof location.geo === 'string' && location.geo.length > 0;
  const hasOsm = typeof location.osm === 'string' && location.osm.length > 0;
  if (!hasGeo && !hasOsm) {
    return null;
  }
  const name = typeof location.name === 'string' && location.name.length > 0 ? location.name : null;
  return {
    name,
    geo: hasGeo ? location.geo : null,
    osm: hasOsm ? (location.osm ?? null) : undefined,
  };
}

/** A chapter time that fits `media_player_time`, or null when it does not. */
const storedChapterTime = (raw: string | number | null | undefined): string | null => {
  if (typeof raw === 'number') {
    return DATABASE_CONSTANTS.mediaPlayerTimeOrNull(raw);
  }
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }
  return DATABASE_CONSTANTS.mediaPlayerTimeOrNull(Number(trimmed));
};

export const compatParsedChapters = (chapters: PIChapter[]): DTOItemChapterCreate[] => {
  const rows: DTOItemChapterCreate[] = [];
  for (const chapter of chapters) {
    const start_time = storedChapterTime(chapter.startTime);
    if (start_time === null) {
      continue;
    }
    const data_hash = getPIChapterMd5Hash(chapter);
    const location = mapChapterLocation(chapter.location);
    rows.push({
      start_time,
      end_time: storedChapterTime(chapter.endTime),
      title: chapter.title || null,
      img: (isValidHttpUrl(chapter.img) && chapter.img) || null,
      web_url: (isValidHttpUrl(chapter.url) && chapter.url) || null,
      table_of_contents: chapter.toc === false ? false : true,
      data_hash,
      ...(location ? { location } : {}),
    });
  }
  return rows;
};

/**
 * Shared chapter transform: assign end_time from next TOC chapter and filter so only
 * TOC chapters (with optional end_time) or non-TOC chapters with end_time are included.
 * Used by both item parseAndGetChapters and add-by-RSS chapters-transcript for consistency.
 */
export function assignChapterEndTimes<
  T extends {
    start_time: string;
    end_time?: string | null;
    table_of_contents: boolean;
  },
>(chapters: T[]): T[] {
  const tocChapters = chapters.filter((ch) => ch.table_of_contents);
  const result: T[] = [];

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    if (!ch) continue;

    if (ch.table_of_contents) {
      const nextToc = tocChapters.find(
        (toc) => parseFloat(toc.start_time) > parseFloat(ch.start_time)
      );
      const end_time = nextToc ? nextToc.start_time : (ch.end_time ?? null);
      result.push({ ...ch, end_time } as T);
    } else {
      if (ch.end_time) {
        result.push(ch);
      }
    }
  }

  return result;
}
