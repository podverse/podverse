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
