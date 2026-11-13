import { describe, expect, it } from 'vitest';

import type { PIChapter } from '../types/partytime.js';
import { buildAddByRSSChapterResponses } from './chaptersTranscript.js';

const chapter = (overrides: Partial<PIChapter> & Pick<PIChapter, 'startTime'>): PIChapter => ({
  endTime: null,
  title: null,
  img: null,
  url: null,
  toc: true,
  ...overrides,
});

const chapterShape = (
  rows: ReturnType<typeof buildAddByRSSChapterResponses>
): Array<{
  id_text: string;
  start_time: string;
  end_time: string | null;
  table_of_contents: boolean;
}> =>
  rows.map((row) => ({
    id_text: row.id_text,
    start_time: row.start_time,
    end_time: row.end_time,
    table_of_contents: row.table_of_contents,
  }));

describe('buildAddByRSSChapterResponses', () => {
  it('fills a table-of-contents end time from the next chapter and numbers kept ids', () => {
    const rows = buildAddByRSSChapterResponses('item1', [
      chapter({ startTime: '0' }),
      chapter({ startTime: '30' }),
    ]);

    expect(chapterShape(rows)).toEqual([
      {
        id_text: 'item1-ch-0',
        start_time: '0',
        end_time: '30',
        table_of_contents: true,
      },
      {
        id_text: 'item1-ch-1',
        start_time: '30',
        end_time: null,
        table_of_contents: true,
      },
    ]);
  });

  it('drops a non-table-of-contents chapter without an end time and keeps one that has one', () => {
    const rows = buildAddByRSSChapterResponses('item1', [
      chapter({ startTime: '0', toc: false }),
      chapter({ startTime: '10', endTime: '25', toc: false }),
      chapter({ startTime: '40' }),
    ]);

    expect(chapterShape(rows)).toEqual([
      {
        id_text: 'item1-ch-0',
        start_time: '10',
        end_time: '25',
        table_of_contents: false,
      },
      {
        id_text: 'item1-ch-1',
        start_time: '40',
        end_time: null,
        table_of_contents: true,
      },
    ]);
  });

  it('returns an empty array when there are no chapters', () => {
    expect(buildAddByRSSChapterResponses('item1', [])).toEqual([]);
  });
});
