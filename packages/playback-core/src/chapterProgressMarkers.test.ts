import { describe, expect, it } from 'vitest';

import type { DTOItemChapter } from '@podverse/helpers';

import { getChapterAtPercent, getChapterBoundaryRatios } from './chapterProgressMarkers.js';

const ch = (
  over: Partial<DTOItemChapter> & Pick<DTOItemChapter, 'id' | 'id_text' | 'table_of_contents'>
): DTOItemChapter => ({
  data_hash: 'h',
  end_time: '10',
  item_chapters_feed_id: 1,
  start_time: '0',
  title: 'x',
  ...over,
});

const chapters: DTOItemChapter[] = [
  ch({
    end_time: '20',
    id: 1,
    id_text: 'one',
    start_time: '0',
    table_of_contents: true,
    title: 'Intro',
  }),
  ch({
    end_time: '40',
    id: 2,
    id_text: 'two',
    start_time: '20',
    table_of_contents: true,
    title: 'Topic A',
  }),
  ch({
    end_time: '60',
    id: 3,
    id_text: 'three',
    start_time: '40',
    table_of_contents: true,
    title: 'Outro',
  }),
];

describe('getChapterBoundaryRatios', () => {
  it('returns interior boundary ratios for a 60s episode', () => {
    const ratios = getChapterBoundaryRatios(chapters, 60);
    expect(ratios).toEqual([20 / 60, 40 / 60]);
  });

  it('returns an empty list when duration is not positive', () => {
    expect(getChapterBoundaryRatios(chapters, 0)).toEqual([]);
  });
});

describe('getChapterAtPercent', () => {
  it('returns the chapter containing the percent position', () => {
    expect(getChapterAtPercent(0.5, chapters, 60)?.title).toBe('Topic A');
  });

  it('returns null when duration is not positive', () => {
    expect(getChapterAtPercent(0.5, chapters, 0)).toBeNull();
  });
});
